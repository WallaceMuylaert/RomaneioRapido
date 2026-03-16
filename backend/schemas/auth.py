from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator
from typing import Optional
from datetime import datetime
import re

# Tamanho máximo de imagem/foto base64 ≈ 3 MB em base64
_MAX_BASE64_BYTES = 4_000_000


def _validate_password_strength(value: str) -> str:
    """Senha: mínimo 8 chars, pelo menos 1 número e 1 letra."""
    if len(value) < 8:
        raise ValueError("A senha deve ter pelo menos 8 caracteres.")
    if not re.search(r"[A-Za-z]", value):
        raise ValueError("A senha deve conter pelo menos uma letra.")
    if not re.search(r"\d", value):
        raise ValueError("A senha deve conter pelo menos um número.")
    return value


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=256)


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    store_name: Optional[str] = Field(None, max_length=150)
    photo_base64: Optional[str] = Field(None, max_length=_MAX_BASE64_BYTES)
    pix_key: Optional[str] = Field(None, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=256)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    store_name: Optional[str] = Field(None, max_length=150)
    photo_base64: Optional[str] = Field(None, max_length=_MAX_BASE64_BYTES)
    pix_key: Optional[str] = Field(None, max_length=100)
    plan_id: Optional[str] = Field(None, max_length=50)
    password: Optional[str] = Field(None, min_length=8, max_length=256)
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validate_password_strength(v)


class UserResponse(UserBase):
    id: int
    is_admin: bool
    plan_id: str
    is_active: bool
    pix_key: Optional[str] = None
    created_at: Optional[datetime] = None
    trial_expired: bool = False
    trial_days_remaining: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1, max_length=256)
    new_password: str = Field(..., min_length=8, max_length=256)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)
