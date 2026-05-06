from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

import os

class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    REFRESH_TOKEN_COOKIE_NAME: str = "rr_refresh_token"
    REFRESH_TOKEN_COOKIE_PATH: str = "/auth"
    REFRESH_TOKEN_COOKIE_SAMESITE: str = "lax"
    REFRESH_TOKEN_COOKIE_SECURE: bool = False
    PROJECT_NAME: str = "RomaneioRapido"
    ENVIRONMENT: str = "development"

    # Email Settings
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASS: Optional[str] = None
    SMTP_FROM: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:5173"

    # Stripe
    STRIPE_ENABLED: bool = True
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_PRICE_BASIC: Optional[str] = None
    STRIPE_PRICE_PLUS: Optional[str] = None
    STRIPE_PRICE_PRO: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
