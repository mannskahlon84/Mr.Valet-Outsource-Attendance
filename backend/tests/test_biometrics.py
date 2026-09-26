import pytest
from app.services.biometrics import verify_face_match, FACE_VERIFICATION_THRESHOLD
from app.services.liveness import verify_liveness, LIVENESS_ACCEPTANCE_THRESHOLD

def test_biometrics_distance():
    # 512-dimensional vector (Mocked for testing cosine match)
    import numpy as np
    vec1 = np.random.rand(512).tolist()
    vec2 = vec1.copy() # exact match
    
    is_match, score = verify_face_match(vec1, vec2)
    assert is_match is True
    assert score >= 0.99
    
    # Random orthogonal vector should fail
    vec3 = np.zeros(512)
    vec3[0] = 1.0
    vec4 = np.zeros(512)
    vec4[1] = 1.0
    is_match, score = verify_face_match(vec3.tolist(), vec4.tolist())
    assert is_match is False
    assert score < FACE_VERIFICATION_THRESHOLD

def test_liveness_mock():
    is_live, score = verify_liveness("genuine_face.jpg")
    assert is_live is True
    assert score >= LIVENESS_ACCEPTANCE_THRESHOLD
    
    is_live, score = verify_liveness("spoof_photo.jpg")
    assert is_live is False
    assert score < LIVENESS_ACCEPTANCE_THRESHOLD

def test_dimensions_validation():
    # 512-d (ArcFace/DeepFace) and 128-d (dlib) are both valid embedding sizes; only a
    # size *mismatch* between the two inputs, or an unsupported size, should raise.
    with pytest.raises(ValueError, match="different face engines"):
        verify_face_match([0.1] * 128, [0.1] * 512)
    with pytest.raises(ValueError, match="Unsupported embedding size"):
        verify_face_match([0.1] * 64, [0.1] * 64)


def test_dlib_distance_match():
    # 128-dimensional vector (dlib/face_recognition): compared by Euclidean distance
    import numpy as np
    vec1 = np.random.rand(128).tolist()
    vec2 = vec1.copy()  # exact match
    is_match, score = verify_face_match(vec1, vec2)
    assert is_match is True
    assert score >= 0.99

    # Far-apart vectors should not match
    vec3 = [0.0] * 128
    vec4 = [5.0] * 128
    is_match, score = verify_face_match(vec3, vec4)
    assert is_match is False

