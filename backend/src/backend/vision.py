import base64, asyncio, time
import cv2, numpy as np
from ultralytics import YOLO
import gemini_vision

def in_coco(target: str):
    return target in _model.names.values()

_model = None
last_gemini = 0
GEMINI_COOLDOWN = 1.5

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

async def verify_hybrid(image_b64: str, target: str):
    global last_gemini
    yolo_good, found = await verify(image_b64, target)
    seen = ", ".join(n for n, _ in found) or "nothing I recognize"

    # Cheap gate: if the target is a COCO class and YOLO doesn't see it, stop here
    if in_coco(target) and not yolo_good:
        return False, seen

    # Throttle Gemini so a 300 ms frame loop doesn't spam it
    now = time.monotonic()
    if now - last_gemini < GEMINI_COOLDOWN:
        return False, seen
    _last_gemini = now

    v = await gemini_vision.gemini_verify(image_b64, target)
    if v is None:
        # Gemini down or timed out: trust YOLO for COCO targets, fail otherwise
        return (yolo_good and in_coco(target)), seen
    return (v.match and v.is_real_object), v.seen


