from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user_flexible
from backend.core.trial_utils import require_active_plan_flexible
from backend.core.limiter import limiter
from backend.models.users import User
from backend.schemas.product_groups import (
    ProductGroupCreate,
    ProductGroupUpdate,
    ProductGroupResponse,
    ProductGroupStockReport,
    GroupedStockReportResponse,
)
from backend.crud import product_groups as crud
from backend.config.logger import get_dynamic_logger
from backend.core.plans_config import PLANS_CONFIG

logger = get_dynamic_logger("product_groups")
router = APIRouter(prefix="/product-groups")


def _resolve_groups_limit(plan_id: str) -> int:
    """Resolves the group limit for a plan, falling back to category limits
    for legacy plan configs that predate `limit_groups`."""
    plan = PLANS_CONFIG.get(plan_id, PLANS_CONFIG["trial"])
    return plan.get("limit_groups", plan.get("limit_categories", 3))


@router.get("/", response_model=List[ProductGroupResponse])
@limiter.limit("200/minute")
def list_product_groups(
    request: Request,
    search: Optional[str] = Query(None, description="Busca por código ou nome"),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible),
):
    try:
        items, _total = crud.list_groups(db, user_id=current_user.id, search=search, skip=skip, limit=limit)
        return items
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao listar grupos de produtos")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/stock-report", response_model=GroupedStockReportResponse)
@limiter.limit("60/minute")
def grouped_stock_report(
    request: Request,
    search: Optional[str] = Query(None),
    include_ungrouped: bool = Query(True, description="Incluir produtos sem grupo"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible),
):
    try:
        return crud.get_grouped_stock_report(
            db, user_id=current_user.id, search=search, include_ungrouped=include_ungrouped
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao gerar relatório agrupado de estoque")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/{group_id}", response_model=ProductGroupResponse)
@limiter.limit("200/minute")
def get_product_group(
    request: Request,
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible),
):
    try:
        group = crud.get_group(db, group_id, user_id=current_user.id)
        if not group:
            raise HTTPException(status_code=404, detail="Grupo não encontrado")
        return group
    except HTTPException:
        raise
    except Exception:
        logger.exception(f"Erro ao buscar grupo ID={group_id}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/{group_id}/stock-report", response_model=ProductGroupStockReport)
@limiter.limit("60/minute")
def group_stock_report(
    request: Request,
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible),
):
    try:
        report = crud.get_group_stock_report(db, group_id, user_id=current_user.id)
        if not report:
            raise HTTPException(status_code=404, detail="Grupo não encontrado")
        return report
    except HTTPException:
        raise
    except Exception:
        logger.exception(f"Erro ao gerar relatório do grupo ID={group_id}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.post("/", response_model=ProductGroupResponse)
@limiter.limit("30/minute")
def create_product_group(
    request: Request,
    payload: ProductGroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_plan_flexible),
):
    try:
        limit = _resolve_groups_limit(current_user.plan_id)
        current_count = crud.count_groups(db, user_id=current_user.id)
        if current_count >= limit:
            raise HTTPException(
                status_code=403,
                detail=f"Limite de grupos atingido para o plano {current_user.plan_id.capitalize()}. (Limite: {limit})",
            )

        logger.info(f"Usuário {current_user.email} criando grupo: {payload.code}")
        return crud.create_group(db, payload, user_id=current_user.id)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("Erro ao criar grupo de produtos")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.put("/{group_id}", response_model=ProductGroupResponse)
@limiter.limit("60/minute")
def update_product_group(
    request: Request,
    group_id: int,
    payload: ProductGroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_plan_flexible),
):
    try:
        updated = crud.update_group(db, group_id, payload, user_id=current_user.id)
        if not updated:
            raise HTTPException(status_code=404, detail="Grupo não encontrado")
        return updated
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception(f"Erro ao atualizar grupo ID={group_id}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.delete("/{group_id}", response_model=ProductGroupResponse)
@limiter.limit("30/minute")
def delete_product_group(
    request: Request,
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_plan_flexible),
):
    try:
        deleted = crud.delete_group(db, group_id, user_id=current_user.id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Grupo não encontrado")
        return deleted
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception(f"Erro ao deletar grupo ID={group_id}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
