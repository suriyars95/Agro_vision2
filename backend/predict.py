from keras.preprocessing.image import load_img, img_to_array
import numpy as np
import tensorflow as tf

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
    'Stem fly': {
        'description': 'Stem fly larvae tunnel inside stems causing wilting and weakening.',
        'severity_low': 'Early larval damage in stems',
        'treatment': 'Apply insecticides like imidacloprid; practice crop rotation',
        'medicines': ['Imidacloprid 17.8% SL', 'Chlorpyrifos 20% EC', 'Spinosad 45% SC']
    },
    'Tan spot': {
        'description': 'Tan spot creates tan-brown lesions with dark borders on leaves.',
        'severity_low': 'Small lesions on leaf surface',
        'treatment': 'Use resistant varieties; apply pyraclostrobin fungicide',
        'medicines': ['Pyraclostrobin 20% EC', 'Azoxystrobin 23% SC', 'Propiconazole 25% EC']
    },
    'Yellow Rust': {
        'description': 'Yellow rust produces bright yellow pustules in linear patterns on leaves.',
        'severity_low': 'Early pustule formation stage',
        'treatment': 'Apply propiconazole or hexaconazole fungicides immediately',
        'medicines': ['Propiconazole 25% EC', 'Hexaconazole 5% SC', 'Azoxystrobin 23% SC']
    }
}

def preprocess_img(img_path, target_size=(255, 255)):
    img = load_img(img_path, target_size=target_size)
    x = img_to_array(img)
    x = x.astype('float32') / 255
    x = np.expand_dims(x, axis=0)
    return x

def classify_image(img_path):
    x = preprocess_img(img_path)
    tflite_model_path = './model/model_new.tflite'
    interpreter = tf.lite.Interpreter(model_path=tflite_model_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    interpreter.set_tensor(input_details[0]['index'], x)
    interpreter.invoke()
    output_data = interpreter.get_tensor(output_details[0]['index'])
    
    labels = {
        0: 'Aphid', 1: 'Black Rust', 2: 'Blast', 3: 'Brown Rust', 4: 'Common Root Rot',
        5: 'Fusarium Head Blight', 6: 'Healthy', 7: 'Leaf Blight', 8: 'Mildew', 9: 'Mite',
        10: 'Septoria', 11: 'Smut', 12: 'Stem fly', 13: 'Tan spot', 14: 'Yellow Rust'
    }
    
    # Get predictions and confidence
    predictions = output_data[0]
    max_index = np.argmax(predictions)
    predicted_class = labels[max_index]
    confidence = float(predictions[max_index] * 100)
    
    # Get disease info
    disease_info = DISEASE_INFO.get(predicted_class, {
        'description': 'Disease information not available',
        'severity_low': 'Unknown severity',
        'treatment': 'Please consult with agricultural experts',
        'medicines': ['Please consult with agricultural experts']
    })
    
    return {
        'disease': predicted_class,
        'confidence': round(confidence, 2),
        'description': disease_info['description'],
        'treatment': disease_info['treatment'],
        'severity_status': disease_info['severity_low'],
        'medicines': disease_info.get('medicines', ['Please consult with agricultural experts'])
    }