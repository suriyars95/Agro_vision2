import os
import json
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class ModelInfo:
    id: str
    name: str
    version: str
    type: str  # 'yolo' or 'fallback' (keras/tflite)
    path: str
    description: str
    enabled: bool = True

class ModelRegistry:
    """
    Manages available AI models and their configuration.
    Persists active model selection to 'models.json'.
    """
    
    CONFIG_FILE = 'models.json'
    
    # Default known models
    DEFAULT_MODELS = [
        ModelInfo(
            id="auraa-fs-2.1",
            name="Auraa fs - 2.1 (Wheat/Pest)",
            version="2.1",
            type="yolo",
            path=os.path.join("backend", "model", "best_wheat_yolo.pt"),
            description="Latest high-performance model for wheat diseases and pests. Uses YOLOv8/v11 architecture."
        ),
        ModelInfo(
            id="auraa-fs-1.3",
            name="Auraa fs - 1.3 (Legacy)",
            version="1.3",
            type="fallback",
            path=os.path.join("backend", "model", "model_new.tflite"),
            description="Legacy TensorFlow Lite model. Lower accuracy but works as a stable backup."
        )
    ]

    def __init__(self):
        self.models: Dict[str, ModelInfo] = {m.id: m for m in self.DEFAULT_MODELS}
        self.active_model_id = self._load_config()

    def _load_config(self) -> str:
        """Load active model ID from config file, or default to best model"""
        try:
            if os.path.exists(self.CONFIG_FILE):
                with open(self.CONFIG_FILE, 'r') as f:
                    config = json.load(f)
                    saved_id = config.get('active_model_id')
                    if saved_id in self.models:
                        logger.info(f"📖 Loaded active model from config: {saved_id}")
                        return saved_id
        except Exception as e:
            logger.warning(f"⚠️ Failed to load model config: {e}")
        
        # Default to the first model (usually the best one)
        default_id = self.DEFAULT_MODELS[0].id
        logger.info(f"👉 Using default model: {default_id}")
        return default_id

    def _save_config(self):
        """Save active model ID to config file"""
        try:
            with open(self.CONFIG_FILE, 'w') as f:
                json.dump({'active_model_id': self.active_model_id}, f, indent=4)
            logger.info(f"💾 Saved active model config: {self.active_model_id}")
        except Exception as e:
            logger.error(f"❌ Failed to save model config: {e}")

    def list_models(self) -> List[Dict]:
        """Return list of all models with 'active' flag"""
        return [
            {**asdict(m), "active": m.id == self.active_model_id}
            for m in self.models.values()
        ]

    def get_active_model(self) -> Optional[ModelInfo]:
        """Get the currently active model info"""
        return self.models.get(self.active_model_id)

    def set_active_model(self, model_id: str) -> bool:
        """Set the active model by ID"""
        if model_id not in self.models:
            logger.error(f"❌ Model ID not found: {model_id}")
            return False
        
        self.active_model_id = model_id
        self._save_config()
        return True

    def get_model(self, model_id: str) -> Optional[ModelInfo]:
        return self.models.get(model_id)
