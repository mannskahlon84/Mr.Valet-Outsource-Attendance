import os
import math
from typing import List, Tuple, Dict, Optional
try:
    from deepface import DeepFace
except Exception:
    DeepFace = None
import numpy as np

# Configurable Verification Threshold
FACE_VERIFICATION_THRESHOLD = float(os.getenv("FACE_VERIFICATION_THRESHOLD", "0.68"))

FACE_ENGINE_AVAILABLE = DeepFace is not None


def _decode_photo(img) -> bytes:
    """Return the raw image bytes of a base64/data-URL selfie, or raise ValueError if it isn't a photo."""
    import base64, io
    from PIL import Image
    if not isinstance(img, str) or not img.strip():
        raise ValueError("No selfie photo was received.")
    data = img.split(",", 1)[1] if img.startswith("data:") else img
    try:
        raw = base64.b64decode(data, validate=False)
        Image.open(io.BytesIO(raw)).verify()
    except Exception:
        raise ValueError("The selfie could not be read as a photo. Please retake it.")
    return raw


def extract_face_embedding(img_path_or_bytes) -> Optional[List[float]]:
    """ArcFace embedding of the selfie, or None when no face engine is installed.

    Without DeepFace there is no way to compare faces, so callers must treat None as
    "photo captured, face not verified" instead of matching on a made-up vector.
    """
    if DeepFace is None:
        _decode_photo(img_path_or_bytes)
        return None
    representations = DeepFace.represent(
        img_path=img_path_or_bytes,
        model_name="ArcFace",
        enforce_detection=False
    )
    if representations and len(representations) > 0 and "embedding" in representations[0]:
        return representations[0]["embedding"]
    raise ValueError("No face detected in the selfie.")

def verify_face_match(embedding1: List[float], embedding2: List[float]) -> Tuple[bool, float]:
    if len(embedding1) != 512 or len(embedding2) != 512:
        raise ValueError("Invalid embedding dimensions. ArcFace requires 512-d vectors.")
        
    vec1 = np.array(embedding1)
    vec2 = np.array(embedding2)
    
    dot = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return False, 0.0
        
    cosine_similarity = dot / (norm1 * norm2)
    is_match = bool(cosine_similarity >= FACE_VERIFICATION_THRESHOLD)
    
    return is_match, float(cosine_similarity)

