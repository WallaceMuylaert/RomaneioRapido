from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserBase(BaseModel):
    email: str
    full_name: str
    phone: Optional[str] = None
    store_name: Optional[str] = None
    photo_base64: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    store_name: Optional[str] = None
    photo_base64: Optional[str] = None
    plan_id: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_admin: bool
    plan_id: str
    is_active: bool
    created_at: Optional[datetime] = None
    trial_expired: bool = False
    trial_days_remaining: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
