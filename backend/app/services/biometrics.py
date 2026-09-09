import os
import math
from typing import List, Tuple, Dict
from deepface import DeepFace
import numpy as np

# Configurable Verification Threshold
FACE_VERIFICATION_THRESHOLD = float(os.getenv("FACE_VERIFICATION_THRESHOLD", "0.68"))

def extract_face_embedding(img_path_or_bytes) -> List[float]:
    try:
        representations = DeepFace.represent(
            img_path=img_path_or_bytes,
            model_name="ArcFace",
            enforce_detection=True
        )
        if not representations or len(representations) == 0:
            raise ValueError("No face detected in the image.")
            
        embedding = representations[0]["embedding"]
        return embedding
    except Exception as e:
        raise ValueError(f"Face extraction failed: {str(e)}")

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

