import os
import math
from typing import List, Tuple, Dict, Optional
import numpy as np

# Lightweight primary engine: dlib, installed via the prebuilt "dlib-bin" wheel (no C++
# compiler needed on the server) plus the "face_recognition_models" package, which bundles
# the actual pretrained weights as ordinary PyPI package data.
#
# We call dlib directly rather than depending on the "face_recognition" convenience package,
# because that package's own install metadata requires the real "dlib" distribution by name
# (triggering a slow/fragile source build) even though "dlib-bin" already provides the same
# importable module. This is the same handful of calls that package makes internally.
try:
    import dlib
    import face_recognition_models
    _face_detector = dlib.get_frontal_face_detector()
    _shape_predictor = dlib.shape_predictor(face_recognition_models.pose_predictor_model_location())
    _face_rec_model = dlib.face_recognition_model_v1(face_recognition_models.face_recognition_model_location())
except Exception:
    dlib = None
    _face_detector = _shape_predictor = _face_rec_model = None

# Optional heavier engine, used only if someone installs it later (see requirements-ai.txt).
# 512-d ArcFace embeddings, compared by cosine similarity.
try:
    from deepface import DeepFace
except Exception:
    DeepFace = None

# dlib/face_recognition: Euclidean distance between 128-d encodings; lower means more alike.
# 0.6 is the threshold face_recognition itself recommends and ships as its own default.
FACE_MATCH_DISTANCE_THRESHOLD = float(os.getenv("FACE_MATCH_DISTANCE_THRESHOLD", "0.6"))

# ArcFace (DeepFace): cosine similarity between 512-d embeddings; higher means more alike.
FACE_VERIFICATION_THRESHOLD = float(os.getenv("FACE_VERIFICATION_THRESHOLD", "0.68"))

FACE_ENGINE = "dlib" if _face_detector is not None else ("deepface" if DeepFace is not None else None)
FACE_ENGINE_AVAILABLE = FACE_ENGINE is not None


def _decode_photo(img) -> np.ndarray:
    """Return the selfie as an RGB pixel array, or raise ValueError if it isn't a readable photo."""
    import base64, io
    from PIL import Image
    if not isinstance(img, str) or not img.strip():
        raise ValueError("No selfie photo was received.")
    data = img.split(",", 1)[1] if img.startswith("data:") else img
    try:
        raw = base64.b64decode(data, validate=False)
        pil_img = Image.open(io.BytesIO(raw))
        pil_img.load()
        return np.array(pil_img.convert("RGB"))
    except Exception:
        raise ValueError("The selfie could not be read as a photo. Please retake it.")


def extract_face_embedding(img_path_or_bytes) -> Optional[List[float]]:
    """A face embedding for the selfie, or None when no face-matching engine is installed.

    Without an engine there is no way to compare faces, so callers must treat None as
    "photo captured, face not verified" instead of matching on a made-up vector.
    """
    if _face_detector is not None:
        pixels = _decode_photo(img_path_or_bytes)
        detections = _face_detector(pixels, 1)
        if not detections:
            raise ValueError("No face detected in the selfie.")
        # Largest face in frame, in case more than one person is in the shot
        largest = max(detections, key=lambda box: box.width() * box.height())
        shape = _shape_predictor(pixels, largest)
        descriptor = _face_rec_model.compute_face_descriptor(pixels, shape)
        return list(descriptor)

    if DeepFace is not None:
        representations = DeepFace.represent(
            img_path=img_path_or_bytes,
            model_name="ArcFace",
            enforce_detection=False
        )
        if representations and len(representations) > 0 and "embedding" in representations[0]:
            return representations[0]["embedding"]
        raise ValueError("No face detected in the selfie.")

    _decode_photo(img_path_or_bytes)
    return None


def verify_face_match(embedding1: List[float], embedding2: List[float]) -> Tuple[bool, float]:
    """True/similarity if two embeddings are the same person. Dispatches on vector length,
    since the two supported engines produce different-sized, differently-scored embeddings."""
    if len(embedding1) != len(embedding2):
        raise ValueError("Invalid embedding dimensions: the two embeddings were made by different face engines.")

    vec1 = np.array(embedding1)
    vec2 = np.array(embedding2)

    if len(embedding1) == 128:
        # dlib/face_recognition: Euclidean distance, lower = more alike
        distance = float(np.linalg.norm(vec1 - vec2))
        is_match = bool(distance <= FACE_MATCH_DISTANCE_THRESHOLD)
        # Keep the return shape "higher = more confident" like the cosine path, for callers/logs
        return is_match, max(0.0, 1.0 - distance)

    if len(embedding1) == 512:
        # ArcFace (DeepFace): cosine similarity, higher = more alike
        dot = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        if norm1 == 0 or norm2 == 0:
            return False, 0.0
        cosine_similarity = dot / (norm1 * norm2)
        is_match = bool(cosine_similarity >= FACE_VERIFICATION_THRESHOLD)
        return is_match, float(cosine_similarity)

    raise ValueError(f"Unsupported embedding size: {len(embedding1)}.")

