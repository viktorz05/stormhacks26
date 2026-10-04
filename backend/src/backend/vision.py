import base64, asyncio
import cv2, numpy as np
from ultralytics import YOLO

_model = None

def load_model():
    global _model
    _model = YOLO("yolo11n.pt")
    _model(np.zeros((480, 640, 3), dtype=np.uint8), verbose=False)

def _detect(image_b64: str, target: str, min_conf: float = 0.5):
    data = base64.b64decode(image_b64.split(",")[-1])   # strips "data:image/jpeg;base64,"
    frame = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    r = _model(frame, verbose=False, conf=min_conf)[0]
    found = [(r.names[int(b.cls[0])], float(b.conf[0])) for b in r.boxes]
    return any(name == target for name, _ in found), found

async def verify(image_b64: str, target: str):
    return await asyncio.to_thread(_detect, image_b64, target)

