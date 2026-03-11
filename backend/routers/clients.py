import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.core.trial_utils import require_active_plan
from backend.core.limiter import limiter
from backend.models.users import User
from backend.schemas.clients import ClientCreate, ClientUpdate, ClientResponse
from backend.crud import clients as crud
from backend.config.logger import get_dynamic_logger

logger = get_dynamic_logger("clients")
router = APIRouter(prefix="/clients")

@router.post("/", response_model=ClientResponse)
@limiter.limit("60/minute")
def create_client(
    request: Request,
    client: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_plan)
):
    try:
        logger.info(f"Usuário {current_user.email} está criando o cliente {client.name}")
        return crud.create_client(db, client, user_id=current_user.id)
    except Exception as e:
        db.rollback()
        logger.exception("Erro crítico ao criar cliente")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/")
@limiter.limit("120/minute")
def list_clients(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        skip = (page - 1) * per_page
        total = crud.count_clients(db, user_id=current_user.id, search=search)
        items = crud.get_clients(db, user_id=current_user.id, skip=skip, limit=per_page, search=search)
        pages = math.ceil(total / per_page) if total > 0 else 1
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pages,
        }
    except Exception as e:
        logger.exception("Erro crítico ao listar clientes")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.put("/{client_id}", response_model=ClientResponse)
@limiter.limit("60/minute")
def update_client(
    request: Request,
    client_id: int,
    client: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_plan)
):
    try:
        db_client = crud.update_client(db, client_id, client, user_id=current_user.id)
        if not db_client:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        logger.info(f"Usuário {current_user.email} atualizou o cliente {client_id}")
        return db_client
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Erro crítico ao atualizar cliente")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.delete("/{client_id}", response_model=ClientResponse)
@limiter.limit("60/minute")
def delete_client(
    request: Request,
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_plan)
):
    try:
        db_client = crud.delete_client(db, client_id, user_id=current_user.id)
        if not db_client:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        logger.info(f"Usuário {current_user.email} excluiu o cliente {client_id}")
        return db_client
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Erro crítico ao excluir cliente")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
