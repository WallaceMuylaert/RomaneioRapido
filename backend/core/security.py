from datetime import datetime, timedelta, timezone
import uuid
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy import func
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.core.config import settings
from backend.core.database import get_db
from backend.config.logger import get_dynamic_logger

_security_logger = get_dynamic_logger("auth")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": now,
        "nbf": now,
        "jti": str(uuid.uuid4()),
        "iss": settings.PROJECT_NAME,
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_user_access_token(user: "User", expires_delta: Optional[timedelta] = None) -> str:
    return create_access_token(
        data={
            "sub": user.email,
            "uid": user.id,
            "tv": getattr(user, "token_version", 0) or 0,
        },
        expires_delta=expires_delta,
    )

def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Extrair IP para logs
    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            _security_logger.warning(f"Token sem 'sub' claim | IP: {client_ip} | Path: {request.url.path}")
            raise credentials_exception
        email = email.strip().lower()
    except JWTError as e:
        _security_logger.warning(
            f"Token JWT inválido/expirado: {type(e).__name__}: {e} "
            f"| IP: {client_ip} | Path: {request.url.path}"
        )
        raise credentials_exception

    from backend.models.users import User
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if user is None:
        _security_logger.warning(f"Token válido mas usuário não encontrado: {email} | IP: {client_ip}")
        raise credentials_exception
    token_version = payload.get("tv")
    user_token_version = getattr(user, "token_version", 0) or 0
    if token_version is not None and int(token_version) != user_token_version:
        _security_logger.warning(f"Token com versao revogada para {email} | IP: {client_ip}")
        raise credentials_exception
    if token_version is None and user_token_version > 0:
        _security_logger.warning(f"Token legado revogado para {email} | IP: {client_ip}")
        raise credentials_exception
    if not user.is_active:
        _security_logger.warning(f"Usuário inativo tentou acessar: {email} | IP: {client_ip} | Path: {request.url.path}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário desativado",
        )
    return user


def get_current_superadmin(current_user: "User" = Depends(get_current_user)):
    """Dependência para rotas que exigem privilégios de Administrador do Sistema."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: Requer privilégios de Administrador"
        )
    return current_user


def get_current_user_flexible(request: Request, db: Session = Depends(get_db)):
    """
    Autenticação flexível: aceita JWT (Bearer) ou API Key (X-API-Key header).
    Use este dependency em endpoints que precisam aceitar ambos os métodos.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")

    # 1. Tentar Bearer token (JWT)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            email: str = payload.get("sub")
            if email:
                email = email.strip().lower()
                from backend.models.users import User
                user = db.query(User).filter(func.lower(User.email) == email).first()
                token_version = payload.get("tv")
                user_token_version = getattr(user, "token_version", 0) or 0 if user else 0
                token_is_current = (
                    user
                    and (
                        (token_version is None and user_token_version == 0)
                        or (token_version is not None and int(token_version) == user_token_version)
                    )
                )
                if user and user.is_active and token_is_current:
                    return user
                elif user and not user.is_active:
                    _security_logger.warning(f"[flexible] Usuário inativo: {email} | IP: {client_ip}")
                else:
                    _security_logger.warning(f"[flexible] Usuário não encontrado: {email} | IP: {client_ip}")
        except JWTError as e:
            _security_logger.warning(f"[flexible] Token JWT inválido: {type(e).__name__}: {e} | IP: {client_ip}")

    # 2. Tentar API Key
    api_key_header = request.headers.get("X-API-Key", "")
    if api_key_header:
        from backend.crud.api_keys import get_user_by_api_key
        result = get_user_by_api_key(db, api_key_header)
        if result:
            user, api_key_obj = result
            return user

        _security_logger.warning(f"[flexible] API Key inválida | IP: {client_ip} | Path: {request.url.path}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key inválida, expirada ou revogada.",
        )

    _security_logger.warning(f"[flexible] Nenhuma credencial fornecida | IP: {client_ip} | Path: {request.url.path}")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais não fornecidas. Use Bearer token ou X-API-Key.",
        headers={"WWW-Authenticate": "Bearer"},
    )

