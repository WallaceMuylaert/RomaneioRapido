from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.core.plans_config import PLANS_CONFIG


def is_trial_expired(user) -> bool:
    """Verifica se o trial do usuário expirou."""
    if user.plan_id != "trial":
        return False

    trial_days = PLANS_CONFIG.get("trial", {}).get("trial_days", 7)
    if not user.created_at:
        return True

    # Normalizar para timezone-aware
    created = user.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)

    expiry = created + timedelta(days=trial_days)
    return datetime.now(timezone.utc) > expiry


def get_trial_days_remaining(user) -> Optional[int]:
    """Retorna dias restantes do trial, ou None se não estiver em trial."""
    if user.plan_id != "trial":
        return None

    trial_days = PLANS_CONFIG.get("trial", {}).get("trial_days", 7)
    if not user.created_at:
        return 0

    created = user.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)

    expiry = created + timedelta(days=trial_days)
    remaining = (expiry - datetime.now(timezone.utc)).days
    return max(remaining, 0)


def require_active_plan(current_user=Depends(get_current_user)):
    """
    FastAPI dependency: bloqueia ações de escrita se o trial expirou.
    Usar em endpoints POST/PUT/PATCH/DELETE.
    Endpoints GET (leitura) NÃO devem usar esta dependency.
    """
    if is_trial_expired(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seu período de teste de 7 dias terminou. Assine um plano para continuar usando o sistema.",
        )
    return current_user
