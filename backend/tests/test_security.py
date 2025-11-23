import jwt
import pytest

from kpix_backend.core.security import create_token, decode_token, hash_password, verify_password


def test_token_roundtrip():
    token = create_token("user-123", "access", expires_minutes=5, extra_claims={"role": "ADMIN"})
    payload = decode_token(token, expected_type="access")
    assert payload["sub"] == "user-123"
    assert payload["role"] == "ADMIN"


def test_decode_token_rejects_wrong_type():
    token = create_token("user-123", "refresh", expires_minutes=5)
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(token, expected_type="access")


def test_password_hash_and_verify():
    hashed = hash_password("super-secret")
    assert verify_password("super-secret", hashed)
    assert not verify_password("wrong-pass", hashed)
