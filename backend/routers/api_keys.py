from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.core.limiter import limiter
from backend.core.plans_config import PLANS_CONFIG
from backend.models.users import User
from backend.schemas.api_keys import ApiKeyCreate, ApiKeyResponse, ApiKeyCreatedResponse
from backend.crud.api_keys import (
    create_api_key,
    list_api_keys,
    count_active_api_keys,
    revoke_api_key,
)
from backend.config.logger import get_dynamic_logger

logger = get_dynamic_logger("api_keys")

router = APIRouter(prefix="/api-keys")

ALLOWED_PLANS = {"plus", "pro", "enterprise"}


def _require_api_key_plan(user: User):
    """Valida se o plano do usuário permite gerar API Keys."""
    if user.plan_id not in ALLOWED_PLANS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seu plano não permite a geração de chaves de API. Faça upgrade para o plano Plus ou superior.",
        )


@router.post("", response_model=ApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def create_key(
    request: Request,
    data: ApiKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gera uma nova API Key. A chave completa só é retornada aqui."""
    _require_api_key_plan(current_user)

    plan_config = PLANS_CONFIG.get(current_user.plan_id, PLANS_CONFIG["trial"])
    max_keys = plan_config.get("limit_api_keys", 0)
    active_count = count_active_api_keys(db, current_user.id)

    if active_count >= max_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Limite de chaves ativas atingido ({max_keys}). Revogue uma chave existente para criar uma nova.",
        )

    try:
        api_key, raw_key = create_api_key(db, current_user.id, data.name)
        logger.info(f"API Key criada: prefix={api_key.key_prefix} user={current_user.email}")

        return ApiKeyCreatedResponse(
            id=api_key.id,
            name=api_key.name,
            key_prefix=api_key.key_prefix,
            is_active=api_key.is_active,
            created_at=api_key.created_at,
            last_used_at=api_key.last_used_at,
            expires_at=api_key.expires_at,
            full_key=raw_key,
        )
    except Exception as e:
        logger.error(f"Erro ao criar API Key para {current_user.email}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("", response_model=list[ApiKeyResponse])
@limiter.limit("30/minute")
def list_keys(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todas as API Keys do usuário."""
    _require_api_key_plan(current_user)

    try:
        keys = list_api_keys(db, current_user.id)
        return keys
    except Exception as e:
        logger.error(f"Erro ao listar API Keys para {current_user.email}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.delete("/{key_id}", status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
def revoke_key(
    request: Request,
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoga (desativa) uma API Key. Somente o dono pode revogar."""
    _require_api_key_plan(current_user)

    try:
        api_key = revoke_api_key(db, current_user.id, key_id)
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chave não encontrada ou não pertence a este usuário.",
            )

        logger.info(f"API Key revogada: id={key_id} prefix={api_key.key_prefix} user={current_user.email}")
        return {"message": "Chave de API revogada com sucesso."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao revogar API Key {key_id} para {current_user.email}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
