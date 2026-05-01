import secrets
import hashlib
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy.orm import Session
from backend.models.api_keys import ApiKey
from backend.core.plans_config import PLANS_WITH_API_ACCESS


def _generate_raw_key() -> str:
    """Gera chave aleatória com prefixo 'rr_' + 48 caracteres hex."""
    return f"rr_{secrets.token_hex(24)}"


def _hash_key(raw_key: str) -> str:
    """Gera hash SHA-256 da chave."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def create_api_key(db: Session, user_id: int, name: str) -> tuple[ApiKey, str]:
    """
    Cria uma nova API Key.
    Retorna (api_key_obj, raw_key). A raw_key só é retornada aqui.
    """
    raw_key = _generate_raw_key()
    key_hash = _hash_key(raw_key)
    key_prefix = raw_key[:11]  # "rr_" + primeiros 8 chars do token

    api_key = ApiKey(
        user_id=user_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=name,
        is_active=True,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return api_key, raw_key


def list_api_keys(db: Session, user_id: int) -> List[ApiKey]:
    """Lista todas as chaves de um usuário (ativas e inativas)."""
    return (
        db.query(ApiKey)
        .filter(ApiKey.user_id == user_id)
        .order_by(ApiKey.created_at.desc())
        .all()
    )


def count_active_api_keys(db: Session, user_id: int) -> int:
    """Conta chaves ativas de um usuário."""
    return (
        db.query(ApiKey)
        .filter(ApiKey.user_id == user_id, ApiKey.is_active == True)
        .count()
    )


def revoke_api_key(db: Session, user_id: int, key_id: int) -> Optional[ApiKey]:
    """Revoga (desativa) uma chave. Retorna None se não encontrada ou não pertence ao usuário."""
    api_key = (
        db.query(ApiKey)
        .filter(ApiKey.id == key_id, ApiKey.user_id == user_id)
        .first()
    )
    if not api_key:
        return None

    api_key.is_active = False
    db.commit()
    db.refresh(api_key)
    return api_key


def get_user_by_api_key(db: Session, raw_key: str):
    """
    Busca o usuário dono da API Key pelo hash.
    Retorna (User, ApiKey) ou None se inválida/expirada/inativa.
    """
    key_hash = _hash_key(raw_key)
    api_key = (
        db.query(ApiKey)
        .filter(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
        .first()
    )

    if not api_key:
        return None

    # Verificar expiração
    if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
        api_key.is_active = False
        db.commit()
        return None

    # Atualizar last_used_at
    api_key.last_used_at = datetime.now(timezone.utc)
    db.commit()

    from backend.models.users import User
    user = db.query(User).filter(User.id == api_key.user_id).first()
    if not user or not user.is_active:
        return None

    if not (getattr(user, "is_admin", False) or getattr(user, "is_unlimited", False) or user.plan_id in PLANS_WITH_API_ACCESS):
        return None

    return user, api_key
