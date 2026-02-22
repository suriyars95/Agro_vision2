# Model Management Guide

This system allows you to manage different versions of your AI models (e.g., "Auraa fs - 1.3", "Auraa fs - 2.1") and switch between them dynamically without restarting the server.

## 1. Supported Models

The system currently supports two main types of models:

| Model ID | Name | Type | Description |
| :--- | :--- | :--- | :--- |
| **`auraa-fs-2.1`** | **Auraa fs - 2.1** | **YOLO (.pt)** | **(Default)** The latest, high-performance model for real-time disease detection. |
| **`auraa-fs-1.3`** | **Auraa fs - 1.3** | **Fallback (.tflite)** | Legacy model. Used as a backup or for comparison. |

## 2. API Endpoints for Management

These endpoints are designed to be used by an **Admin Panel**.

### List All Models
**GET** `/api/models`
Returns a list of all available models and shows which one is currently `active`.

```json
{
  "success": true,
  "models": [
    {
      "id": "auraa-fs-2.1",
      "name": "Auraa fs - 2.1 (Wheat/Pest)",
      "type": "yolo",
      "active": true,
      ...
    },
    {
      "id": "auraa-fs-1.3",
      "name": "Auraa fs - 1.3 (Legacy)",
      "type": "fallback",
      "active": false,
      ...
    }
  ]
}
```

### Switch Active Model
**POST** `/api/models/switch`
Immediately unloads the current model and loads the new one. Settings are saved to `models.json` and persist after restart.

**Body:**
```json
{
  "model_id": "auraa-fs-1.3"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Switched to model: Auraa fs - 1.3 (Legacy)",
  "active_model": "auraa-fs-1.3"
}
```

## 3. Adding a New Model (For Developers)

To add a new model (e.g., "Auraa fs - 3.0"):

1.  **Upload the file**: Place the `.pt` or `.tflite` file in `Backend/model/`.
2.  **Register it**: Open `Backend/model_registry.py` and add a new entry to the `DEFAULT_MODELS` list:

```python
ModelInfo(
    id="auraa-fs-3.0",
    name="Auraa fs - 3.0 (Next Gen)",
    version="3.0",
    type="yolo",
    path=os.path.join("backend", "model", "v3_best.pt"),
    description="Experimental model with new disease classes."
)
```

3.  **Restart Backend**: The new model will now appear in the list and can be switched to via API.

## 4. File Structure
- `Backend/model/`: Stores the actual model files.
- `Backend/models.json`: Stores the ID of the currently active model (auto-generated).
- `Backend/model_registry.py`: Code that defines the available models.
