"""
Mock prediction service - Works without TensorFlow/Keras
Used for testing and development
"""

import numpy as np
import random

# Disease descriptions and recommendations
DISEASE_INFO = {
    'Aphid': {
        'description': 'Aphids are small insects that suck sap from crops, causing yellowing and distortion of leaves.',
        'severity_low': 'Mild infestation with minimal crop damage',
        'treatment': 'Use insecticidal soap or neem oil; introduce natural predators like ladybugs',
        'medicines': ['Imidacloprid 17.8% SL', 'Neem Oil 3% EC', 'Pyrethrins 3.2%']
    },
    'Black Rust': {
        'description': 'Black rust is a fungal disease characterized by dark brown to black pustules on plant surfaces.',
        'severity_low': 'Early stage infection with limited spread',
        'treatment': 'Apply fungicide containing azoxystrobin or propiconazole; remove infected plant parts',
        'medicines': ['Azoxystrobin 23% SC', 'Propiconazole 25% EC', 'Mancozeb 75% WP']
    },
    'Blast': {
        'description': 'Blast disease is a fungal infection causing severe damage to grains and cereals.',
        'severity_low': 'Early lesion formation with manageable spread',
        'treatment': 'Apply triazole fungicides; ensure proper field drainage',
        'medicines': ['Tebuconazole 250 EC', 'Azoxystrobin 23% SC', 'Carbendazim 50% WP']
    },
    'Brown Rust': {
        'description': 'Brown rust causes orange-brown pustules on leaves, reducing photosynthesis.',
        'severity_low': 'Initial pustule development stage',
        'treatment': 'Apply propiconazole-based fungicides; improve air circulation',
        'medicines': ['Propiconazole 25% EC', 'Tebuconazole 250 EC', 'Hexaconazole 5% SC']
    },
    'Common Root Rot': {
        'description': 'Root rot disease affects the root system, causing wilting and stunted growth.',
        'severity_low': 'Localized root infection',
        'treatment': 'Improve soil drainage; use disease-resistant varieties; rotate crops',
        'medicines': ['Carbendazim 50% WP', 'Metalaxyl 8% + Mancozeb 64% WS', 'Trichoderma 1% WP']
    },
    'Fusarium Head Blight': {
        'description': 'Fusarium head blight causes premature ripening and grain damage in cereals.',
        'severity_low': 'Early infection stage with limited grain damage',
        'treatment': 'Apply carbendazim or tebuconazole at heading stage; use resistant varieties',
        'medicines': ['Carbendazim 50% WP', 'Tebuconazole 250 EC', 'Prochloraz 45% EC']
    },
    'Healthy': {
        'description': 'No disease detected. The plant appears healthy and disease-free.',
        'severity_low': 'Excellent crop condition',
        'treatment': 'Continue regular monitoring and crop management practices',
        'medicines': ['No medicine required']
    },
    'Leaf Blight': {
        'description': 'Leaf blight causes brown lesions with concentric rings on leaves.',
        'severity_low': 'Small lesions on lower leaves',
        'treatment': 'Prune affected leaves; apply copper-based fungicides',
        'medicines': ['Copper Oxychloride 50% WP', 'Mancozeb 75% WP', 'Chlorothalonil 75% WP']
    },
    'Mildew': {
        'description': 'Powdery mildew creates white powder-like coating on leaves.',
        'severity_low': 'Early white powder formation',
        'treatment': 'Apply sulfur dust or potassium bicarbonate; improve ventilation',
        'medicines': ['Sulfur 80% WDG', 'Potassium Bicarbonate 85%', 'Triadimefon 25% WP']
    },
    'Mite': {
        'description': 'Mites are tiny arachnids causing yellowing and fine webbing on plants.',
        'severity_low': 'Low population density',
        'treatment': 'Use miticides; spray with water to remove webs; release predatory mites',
        'medicines': ['Spiromesifen 22.9% SC', 'Diafenthiuron 50% WP', 'Abamectin 1.9% EC']
    },
    'Septoria': {
        'description': 'Septoria causes small brown spots with gray centers on leaves.',
        'severity_low': 'Initial spot formation on older leaves',
        'treatment': 'Remove infected leaves; apply chlorothalonil fungicide',
        'medicines': ['Chlorothalonil 75% WP', 'Mancozeb 75% WP', 'Azoxystrobin 23% SC']
    },
    'Smut': {
        'description': 'Smut produces black, sooty masses of spores in flowers and grains.',
        'severity_low': 'Early smut ball development',
        'treatment': 'Use resistant varieties; seed treatment with fungicides',
        'medicines': ['Carboxin 75% WP', 'Trichoderma 1% WP', 'Seed treatment fungicides']
    },
    'Stem Fly': {
        'description': 'Stem fly larvae tunnel inside stems causing wilting and weakening.',
        'severity_low': 'Early larval tunneling stage',
        'treatment': 'Use insecticides; maintain field hygiene',
        'medicines': ['Cartap 50% SP', 'Monocrotophos 36% SL', 'Endosulfan 35% EC']
    },
    'Yellow Rust': {
        'description': 'Yellow rust causes yellow stripes and powder on leaves.',
        'severity_low': 'Early pustule formation',
        'treatment': 'Apply propiconazole or tebuconazole fungicides',
        'medicines': ['Propiconazole 25% EC', 'Tebuconazole 250 EC', 'Azoxystrobin 23% SC']
    },
}

def classify_image(image_path):
    """
    Mock classification function that returns random disease predictions
    This is for testing frontend without TensorFlow/Keras
    """
    
    # List of diseases to randomly select from
    diseases = list(DISEASE_INFO.keys())
    
    # Randomly select a disease
    disease = random.choice(diseases)
    
    # Generate random confidence (mostly high, some low)
    confidence = random.uniform(70, 98)
    
    # Get disease info
    disease_info = DISEASE_INFO[disease]
    
    # Create 1-3 random boxes (normalized coordinates)
    boxes = []
    for _ in range(random.randint(1, 3)):
        x = random.uniform(0.05, 0.6)
        y = random.uniform(0.05, 0.6)
        w = random.uniform(0.2, 0.8 - x)
        h = random.uniform(0.2, 0.8 - y)
        boxes.append({'x': round(x, 3), 'y': round(y, 3), 'w': round(w, 3), 'h': round(h, 3)})

    result = {
        'disease': disease,
        'confidence': round(confidence, 1),
        'description': disease_info['description'],
        'treatment': disease_info['treatment'],
        'medicines': disease_info['medicines'],
        'severity_low': disease_info['severity_low'],
        'boxes': boxes
    }
    
    return result
