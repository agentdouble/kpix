from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, Field, field_validator

from kpix_backend.schemas.user import UserPublic


class SignupRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    full_name: str
    organization_name: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        try:
            return validate_email(value, allow_reserved=True).email
        except EmailNotValidError as exc:
            raise ValueError(str(exc)) from exc


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        try:
            return validate_email(value, allow_reserved=True).email
        except EmailNotValidError as exc:
            raise ValueError(str(exc)) from exc


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPublic
