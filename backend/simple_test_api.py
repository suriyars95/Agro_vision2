"""
Ultra-simple test API using only built-in and minimal dependencies.
No Flask, just raw HTTP server.
"""
import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import tempfile
import io

sys.path.insert(0, os.path.dirname(__file__))
from predict_fallback import classify_image

class TestAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests (health check)."""
        if self.path == '/':
            response = {
                'status': 'OK',
                'message': 'Disease Detection API (Simple Test Mode)',
                'yolo_enabled': False
            }
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_POST(self):
        """Handle POST requests."""
        if self.path == '/predict':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                
                # For multipart form-data, just use a dummy image
                # In real use, would parse multipart properly
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                    tmp.write(body if body else b'\xFF\xD8\xFF\xE0')  # JPEG header if empty
                    temp_path = tmp.name
                
                # Get prediction
                result = classify_image(temp_path)
                print(f"✓ Mock prediction: {result['disease']} ({result['confidence']}%)")
                
                # Format response
                response = {
                    'fileReceived': True,
                    'disease': result['disease'],
                    'confidence': result['confidence'],
                    'description': result['description'],
                    'treatment': result['treatment'],
                    'medicines': result['medicines'],
                    'boxes': [
                        {
                            'class': result['disease'],
                            'conf': result['confidence'],
                            'x': 0.1,
                            'y': 0.2,
                            'w': 0.8,
                            'h': 0.6,
                            'percent': 48.0
                        }
                    ]
                }
                
                # Clean up
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
            
            except Exception as e:
                print(f"❌ Error: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                error_response = {'fileReceived': False, 'error': str(e)}
                self.wfile.write(json.dumps(error_response).encode())
        
        elif self.path == '/predict' and self.command == 'OPTIONS':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.end_headers()
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """Suppress default logging."""
        pass

if __name__ == '__main__':
    port = 5000
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, TestAPIHandler)
    print(f"🚀 Starting Simple Test API on http://localhost:{port}")
    print(f"POST http://localhost:{port}/predict - send image for disease detection")
    print(f"GET  http://localhost:{port}/ - health check")
    httpd.serve_forever()
