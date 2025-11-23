from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Literal

import jwt
from passlib.context import CryptContext

from .config import get_settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
settings = get_settings()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_token(
    subject: str,
    token_type: Literal["access", "refresh"],
    expires_minutes: int,
    extra_claims: Dict[str, Any] | None = None,
) -> str:
    now = datetime.now(tz=timezone.utc)
    expire = now + timedelta(minutes=expires_minutes)
    payload: Dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str, expected_type: Literal["access", "refresh"]) -> Dict[str, Any]:
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    token_type = payload.get("type")
    if token_type != expected_type:
        raise jwt.InvalidTokenError("Incorrect token type")
    return payload
