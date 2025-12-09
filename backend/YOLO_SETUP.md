# YOLO / PyTorch Setup Guide

This project supports optional YOLO inference using the `ultralytics` package (YOLOv8). The backend will use it when the environment variable `USE_YOLO=1` is set and the `ultralytics` package is available.

Important notes:
- PyTorch installation depends on your platform and whether you want GPU acceleration (CUDA). Use the official selector at https://pytorch.org/ to find the correct install command for your machine.
- `ultralytics` is a lightweight wrapper for YOLOv8 that will download official prebuilt weights (e.g., `yolov8n.pt`) if no local model is provided. For production, replace with your trained `best.pt` placed at `backend/models/best.pt`.

Recommended install steps (PowerShell):

1. Create/activate a Python venv (optional but recommended):

```powershell
cd D:\Programfiles_Company\Agrofrontback2\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install PyTorch (use the command generated at https://pytorch.org/). Example CPU-only command:

```powershell
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

If you have CUDA and want GPU acceleration, choose the correct command on the PyTorch website.

3. Install `ultralytics` and other backend deps:

```powershell
pip install -r requirements.txt
# or explicitly
pip install ultralytics
```

4. (Optional) Put your trained YOLO model at `backend/models/best.pt`.

5. Run the backend with YOLO enabled:

```powershell
# On PowerShell set environment var and run
$env:USE_YOLO = '1'
python .\app.py
```

6. Confirm the endpoint works by posting an image to `http://localhost:5000/predict`.

Notes about performance:
- On CPU,YOLOv8n is fast but still significantly slower than the mock; expect inference times on the order of 100-600 ms depending on CPU.
- For real-time drone streams and live camera, a GPU will substantially improve throughput.

If installation fails due to platform wheel availability, consult PyTorch docs to pick the correct wheel for your Python and OS.
