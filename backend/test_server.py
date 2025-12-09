"""
Minimal test server without Jinja2/complex Flask imports.
Used for smoke testing the YOLO API integration.
"""
import json
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from predict_fallback import classify_image
from flask import Flask, request, jsonify
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/', methods=['GET'])
def health():
    return jsonify({
        'status': 'OK',
        'message': 'Disease Detection API (Test Mode)',
        'yolo_enabled': False
    }), 200

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    """Minimal predict endpoint for testing."""
    if request.method == 'OPTIONS':
        return '', 200
    
    if 'file' not in request.files:
        return jsonify({'fileReceived': False, 'error': 'No file'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'fileReceived': False, 'error': 'Empty filename'}), 400
    
    try:
        # Save temp file
        temp_path = '/tmp/test_frame.jpg'
        file.save(temp_path)
        
        # Get prediction
        result = classify_image(temp_path)
        logger.info(f"✓ Mock prediction: {result['disease']} ({result['confidence']}%)")
        
        # Format response with boxes
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
        
        return jsonify(response), 200
    
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'fileReceived': False, 'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("🚀 Starting Minimal Test API on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
