"""
Fallback mock predictor when TensorFlow/Keras is not available.
Returns mock disease predictions for testing.
"""
import random

DISEASE_INFO = {
    'Aphid': {
        'description': 'Aphids are small insects that suck sap from crops.',
        'treatment': 'Use insecticidal soap or neem oil',
        'medicines': ['Imidacloprid 17.8% SL', 'Neem Oil 3% EC'],
        'confidence_range': (75, 95)
    },
    'Black Rust': {
        'description': 'Fungal disease with dark brown pustules.',
        'treatment': 'Apply fungicide',
        'medicines': ['Azoxystrobin 23% SC', 'Propiconazole 25% EC'],
        'confidence_range': (70, 90)
    },
    'Blast': {
        'description': 'Fungal infection causing severe grain damage.',
        'treatment': 'Apply triazole fungicides',
        'medicines': ['Tebuconazole 250 EC', 'Azoxystrobin 23% SC'],
        'confidence_range': (65, 85)
    },
    'Healthy': {
        'description': 'No disease detected.',
        'treatment': 'Continue regular monitoring',
        'medicines': [],
        'confidence_range': (80, 100)
    }
}

def classify_image(img_path):
    """Mock predictor - randomly selects a disease with random confidence."""
    disease_options = list(DISEASE_INFO.keys())
    selected_disease = random.choice(disease_options)
    info = DISEASE_INFO[selected_disease]
    
    conf_min, conf_max = info['confidence_range']
    confidence = round(random.uniform(conf_min, conf_max), 2)
    
    return {
        'disease': selected_disease,
        'confidence': confidence,
        'description': info['description'],
        'treatment': info['treatment'],
        'severity_status': 'Testing mode - mock prediction',
        'medicines': info.get('medicines', [])
    }
