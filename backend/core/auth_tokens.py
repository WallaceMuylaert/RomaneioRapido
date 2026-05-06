import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Request, Response
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.models.auth_sessions import RefreshSession
from backend.models.users import User


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def make_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip", "")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


def _cookie_secure() -> bool:
    return settings.REFRESH_TOKEN_COOKIE_SECURE or settings.ENVIRONMENT.lower() == "production"


def set_refresh_cookie(response: Response, token: str) -> None:
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    response.set_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        value=token,
        max_age=max_age,
        expires=max_age,
        httponly=True,
        secure=_cookie_secure(),
        samesite=settings.REFRESH_TOKEN_COOKIE_SAMESITE,
        path=settings.REFRESH_TOKEN_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        path=settings.REFRESH_TOKEN_COOKIE_PATH,
        secure=_cookie_secure(),
        samesite=settings.REFRESH_TOKEN_COOKIE_SAMESITE,
        httponly=True,
    )


def create_refresh_session(db: Session, user: User, request: Request) -> str:
    token = make_refresh_token()
    session = RefreshSession(
        user_id=user.id,
        token_hash=hash_token(token),
        user_agent=(request.headers.get("user-agent") or "-")[:255],
        ip_address=get_client_ip(request),
        expires_at=utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    db.commit()
    return token


def get_active_refresh_session(db: Session, token: str) -> Optional[RefreshSession]:
    session = db.query(RefreshSession).filter(RefreshSession.token_hash == hash_token(token)).first()
    if not session or session.revoked_at is not None:
        return None

    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= utc_now():
        session.revoked_at = utc_now()
        db.commit()
        return None

    return session


def rotate_refresh_session(db: Session, session: RefreshSession, request: Request) -> str:
    token = make_refresh_token()
    session.token_hash = hash_token(token)
    session.last_used_at = utc_now()
    session.user_agent = (request.headers.get("user-agent") or "-")[:255]
    session.ip_address = get_client_ip(request)
    session.expires_at = utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db.commit()
    db.refresh(session)
    return token


def revoke_refresh_token(db: Session, token: str) -> bool:
    session = get_active_refresh_session(db, token)
    if not session:
        return False
    session.revoked_at = utc_now()
    db.commit()
    return True


def revoke_all_user_refresh_sessions(db: Session, user_id: int) -> None:
    now = utc_now()
    db.query(RefreshSession).filter(
        RefreshSession.user_id == user_id,
        RefreshSession.revoked_at.is_(None),
    ).update({"revoked_at": now}, synchronize_session=False)
    db.commit()


def revoke_user_sessions_and_tokens(db: Session, user: User) -> None:
    user.token_version = (user.token_version or 0) + 1
    revoke_all_user_refresh_sessions(db, user.id)


def mark_user_credentials_changed(db: Session, user: User) -> None:
    user.password_changed_at = utc_now()
    revoke_user_sessions_and_tokens(db, user)
