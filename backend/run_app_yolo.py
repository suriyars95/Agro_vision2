#!/usr/bin/env python
"""
Flask app launcher with YOLO enabled.
Uses backend/model/yolo11n.pt if available.
"""
import os
import sys

# Enable YOLO
os.environ['USE_YOLO'] = '1'
sys.path.insert(0, os.path.dirname(__file__))

print("🚀 Starting Flask app with YOLO enabled")
print("📊 Model path: backend/model/yolo11n.pt (or yolov8n.pt fallback)")

try:
    from werkzeug.utils import secure_filename
    from flask import Flask, request, jsonify, make_response, Response
    from yolo_detector import detect as yolo_detect
    from predict_mock import classify_image
    import logging

    app = Flask(__name__)

    # Manual CORS handling
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

    UPLOAD_FOLDER = 'uploads'
    MAX_FILE_SIZE = 5 * 1024 * 1024

    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    def allowed_file(filename):
        ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp'}
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

    @app.route('/', methods=['GET'])
    def main_page():
        return jsonify({
            'status': 'OK',
            'message': 'Live Disease Detection API with YOLO',
            'model': 'yolo11n.pt (or yolov8n.pt fallback)',
            'endpoints': {
                'predict': '/predict (POST) - Upload image for disease detection'
            }
        }), 200

    @app.route('/predict', methods=['POST', 'OPTIONS'])
    def predict():
        """Detect disease in uploaded image with YOLO."""
        if request.method == 'OPTIONS':
            return '', 200
            
        if 'file' not in request.files:
            logger.warning("No file in request")
            return jsonify({'fileReceived': False, 'error': 'No file part'}), 400

        file = request.files['file']
        if file.filename == '':
            logger.warning("Empty filename")
            return jsonify({'fileReceived': False, 'error': 'No selected file'}), 400

        if not allowed_file(file.filename):
            logger.warning(f"Invalid file type: {file.filename}")
            return jsonify({'fileReceived': False, 'error': 'Invalid file type'}), 400

        saved_img_path = None
        try:
            filename = secure_filename(file.filename)
            saved_img_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(saved_img_path)
            logger.info(f"✓ Processing file: {filename}")
            
            # Use YOLO for detection
            try:
                yolo_boxes = yolo_detect(saved_img_path, conf_thresh=0.25)
                logger.info(f"✓ YOLO detections: {len(yolo_boxes)} boxes")
                response = {
                    'fileReceived': True,
                    'disease': None,
                    'confidence': None,
                    'description': 'YOLO object detection result',
                    'treatment': None,
                    'medicines': [],
                    'boxes': yolo_boxes,
                }
                return jsonify(response), 200
            except Exception as e:
                logger.warning(f"⚠ YOLO detection failed: {e}, falling back to mock")
                # Fallback to mock if YOLO fails
                result = classify_image(saved_img_path)
                response = {
                    'fileReceived': True,
                    'disease': result['disease'],
                    'confidence': result['confidence'],
                    'description': result['description'],
                    'treatment': result['treatment'],
                    'medicines': result.get('medicines', []),
                    'boxes': result.get('boxes', [])
                }
                return jsonify(response), 200
            
        except Exception as e:
            logger.error(f"Error: {str(e)}")
            return jsonify({'fileReceived': False, 'error': 'Processing failed'}), 500
        finally:
            if saved_img_path and os.path.exists(saved_img_path):
                os.remove(saved_img_path)

    if __name__ == '__main__':
        print("🚀 Starting Flask app on http://localhost:5000")
        print("🤖 YOLO enabled - using yolo11n.pt or yolov8n.pt")
        app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure TensorFlow and ultralytics are installed in the venv")
    sys.exit(1)
