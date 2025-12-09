"""
Simple Disease Detection API - No Flask Jinja2 dependency
Uses http.server instead of Flask
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import tempfile
import shutil
from urllib.parse import urlparse, parse_qs
import sys

try:
    from predict import classify_image
except ImportError:
    print("✓ Using mock prediction")
    from predict_mock import classify_image

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def parse_multipart(handler):
    """Simple multipart form parser"""
    content_type = handler.headers.get('Content-Type', '')
    content_length = int(handler.headers.get('Content-Length', 0))
    
    if content_length == 0:
        return None, None
    
    # Read boundary
    if 'boundary=' in content_type:
        boundary = content_type.split('boundary=')[1].split(';')[0].strip()
        boundary_bytes = ('--' + boundary).encode()
        
        body = handler.rfile.read(content_length)
        parts = body.split(boundary_bytes)
        
        for part in parts:
            if b'filename=' in part:
                # Extract filename
                start = part.find(b'filename="') + 10
                end = part.find(b'"', start)
                filename = part[start:end].decode()
                
                # Extract file content
                headers_end = part.find(b'\r\n\r\n')
                if headers_end != -1:
                    file_start = headers_end + 4
                    file_end = part.rfind(b'\r\n')
                    file_content = part[file_start:file_end]
                    
                    return filename, file_content
    
    return None, None

class DiseaseDetectionHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {
                'status': 'OK',
                'message': 'Live Disease Detection API',
                'endpoints': {
                    'predict': '/predict (POST)'
                }
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
    
    def do_POST(self):
        if self.path == '/predict':
            try:
                filename, file_content = parse_multipart(self)
                
                if not filename or not file_content:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'fileReceived': False, 'error': 'No file'}).encode())
                    return
                
                # Save file
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                with open(filepath, 'wb') as f:
                    f.write(file_content)
                
                # Process
                result = classify_image(filepath)
                
                response = {
                    'fileReceived': True,
                    'disease': result['disease'],
                    'confidence': result['confidence'],
                    'description': result['description'],
                    'treatment': result['treatment'],
                    'severity_low': result.get('severity_low', ''),
                    'medicines': result.get('medicines', [])
                }
                
                # Clean up
                if os.path.exists(filepath):
                    os.remove(filepath)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
                print(f"✓ Detected: {result['disease']} ({result['confidence']}%)")
                
            except Exception as e:
                print(f"Error: {str(e)}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'fileReceived': False, 'error': 'Processing failed'}).encode())
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        # Suppress default logging
        pass

if __name__ == '__main__':
    server_address = ('0.0.0.0', 5000)
    httpd = HTTPServer(server_address, DiseaseDetectionHandler)
    print("🚀 Disease Detection API running on http://localhost:5000")
    print("📍 POST /predict - Upload image for disease classification")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n✓ Server stopped")
        httpd.server_close()
