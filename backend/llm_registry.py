import os
import json
import logging
import requests
from typing import Dict, Optional, Any
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class LLMInfo:
    id: str
    name: str
    type: str  # 'local' or 'online'
    model: str
    base_url: Optional[str] = None
    api_key_env: Optional[str] = None
    description: str = ""

class LLMRegistry:
    CONFIG_FILE = 'llm_config.json'

    DEFAULT_MODELS = [
        LLMInfo(
            id="ollama-llama3",
            name="Ollama (Local)",
            type="local",
            model="qwen2.5:0.5b",
            base_url="http://localhost:11434",
            description="Local LLM using Ollama. No internet required."
        ),
        LLMInfo(
            id="groq-llama3",
            name="Groq (Online API)",
            type="online",
            model="llama-3.3-70b-versatile",
            api_key_env="GROQ_API_KEY",
            description="Fast online LLM using Groq API."
        ),
        LLMInfo(
            id="gemini-flash",
            name="Google Gemini (Online API)",
            type="online",
            model="gemini-2.5-flash",
            api_key_env="GEMINI_API_KEY",
            description="Fast online LLM using Google Gemini API."
        )
    ]

    def __init__(self):
        self.models: Dict[str, LLMInfo] = {m.id: m for m in self.DEFAULT_MODELS}
        self.active_model_id = self._load_config()

    def _load_config(self) -> str:
        try:
            if os.path.exists(self.CONFIG_FILE):
                with open(self.CONFIG_FILE, 'r') as f:
                    config = json.load(f)
                    saved_id = config.get('active_model_id')
                    if saved_id in self.models:
                        return saved_id
        except Exception as e:
            logger.warning(f"Failed to load LLM config: {e}")
        
        return self.DEFAULT_MODELS[0].id

    def _save_config(self):
        try:
            with open(self.CONFIG_FILE, 'w') as f:
                json.dump({'active_model_id': self.active_model_id}, f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save LLM config: {e}")

    def list_models(self):
        return [
            {**asdict(m), "active": m.id == self.active_model_id}
            for m in self.models.values()
        ]

    def get_active_model(self) -> Optional[LLMInfo]:
        return self.models.get(self.active_model_id)

    def set_active_model(self, model_id: str) -> bool:
        if model_id not in self.models:
            return False
        self.active_model_id = model_id
        self._save_config()
        return True

    def generate_report(self, analysis_data: dict) -> Dict[str, Any]:
        """
        Generate report using the active LLM.
        Expected output format: JSON with 'treatments' and 'risk_analysis'
        """
        model = self.get_active_model()
        if not model:
            raise ValueError("No active LLM found")

        prompt = self._build_prompt(analysis_data)
        
        system_prompt = """You are an expert agricultural AI assistant. 
Analyze the provided crop disease detection data and provide professional, actionable advice.
Respond ONLY with a valid JSON object matching this structure exactly:
{
  "report_overview": "A short, simple abstract paragraph summarizing the major findings and overarching conclusion of the crop analysis.",
  "treatments": [
    {"title": "Title 1", "description": "Actionable step 1"}
  ],
  "risk_analysis": [
    {"label": "Spread Probability", "value": "High/Medium/Low (Percentage)", "severity": "high/medium/low"},
    {"label": "Economic Impact", "value": "Severe/Moderate/Minor", "severity": "high/medium/low"},
    {"label": "Next Scan Recommended", "value": "Timeframe", "severity": "info"}
  ]
}
Do not include any other text or markdown formatting before or after the JSON.
"""

        if model.type == 'local':
            return self._call_ollama(model, system_prompt, prompt)
        elif model.type == 'online':
            if model.id.startswith('groq'):
                return self._call_groq(model, system_prompt, prompt)
            elif model.id.startswith('gemini'):
                return self._call_gemini(model, system_prompt, prompt)
            else:
                raise ValueError(f"Unsupported online model: {model.id}")
        else:
            raise ValueError(f"Unsupported model type: {model.type}")

    def _build_prompt(self, analysis_data: dict) -> str:
        # extract data to build prompt
        summary = analysis_data.get('disease_summary', [])
        if not summary:
            # Maybe it's raw detections
            diseases = analysis_data.get('diseases', [])
            summary_text = json.dumps(diseases, indent=2)
        else:
            summary_text = json.dumps(summary, indent=2)
            
        return f"Detection Summary:\n{summary_text}\nBased on this data, please provide recommended treatments and risk analysis."

    def _call_ollama(self, model: LLMInfo, system_prompt: str, prompt: str) -> Dict[str, Any]:
        url = f"{model.base_url}/api/chat"
        payload = {
            "model": model.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "format": "json"
        }
        try:
            # Increased timeout to 120 seconds to accommodate slower local hardware or larger prompts
            response = requests.post(url, json=payload, timeout=120)
            response.raise_for_status()
            result = response.json()
            content = result.get('message', {}).get('content', '{}')
            return json.loads(content)
        except Exception as e:
            logger.error(f"Ollama API error: {e}")
            raise RuntimeError(f"Failed to generate report with Ollama: {str(e)}")

    def _call_groq(self, model: LLMInfo, system_prompt: str, prompt: str) -> Dict[str, Any]:
        api_key = os.environ.get(model.api_key_env) if model.api_key_env else None
        if not api_key:
            raise RuntimeError(f"Missing API key for {model.name}. Please set {model.api_key_env} in .env")

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            result = response.json()
            content = result.get('choices', [{}])[0].get('message', {}).get('content', '{}')
            return json.loads(content)
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise RuntimeError(f"Failed to generate report with Groq: {str(e)}")

    def _call_gemini(self, model: LLMInfo, system_prompt: str, prompt: str) -> Dict[str, Any]:
        api_key = os.environ.get(model.api_key_env) if model.api_key_env else None
        if not api_key:
            raise RuntimeError(f"Missing API key for {model.name}. Please set {model.api_key_env} in .env")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model.model}:generateContent?key={api_key}"
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "response_mime_type": "application/json"
            }
        }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            result = response.json()
            content = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '{}')
            return json.loads(content)
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise RuntimeError(f"Failed to generate report with Gemini: {str(e)}")
