from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.core.trial_utils import require_active_plan
from backend.core.limiter import limiter
from backend.models.users import User
from backend.schemas.inventory import InventoryMovementCreate, InventoryMovementResponse, StockLevel, InventoryMovementPaginatedResponse, MovementType, StockLevelPaginatedResponse
from backend.crud import inventory as crud
from backend.config.logger import get_dynamic_logger

logger = get_dynamic_logger("inventory")
router = APIRouter(prefix="/inventory")


@router.post("/movements", response_model=InventoryMovementResponse)
@limiter.limit("60/minute")
def create_movement(
    request: Request,
    movement: InventoryMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_plan)
):
    try:
        logger.info(f"Usuário {current_user.email} registrou movimentação de {movement.quantity} para o produto ID={movement.product_id} do tipo {movement.movement_type}")
        return crud.create_movement(db, movement, user_id=current_user.id)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Erro crítico ao criar movimentação de estoque")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/movements", response_model=InventoryMovementPaginatedResponse)
@limiter.limit("60/minute")
def list_movements(
    request: Request,
    product_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    movement_type: Optional[MovementType] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    include_cancelled: bool = Query(False),
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        items, total = crud.get_movements(
            db, 
            user_id=current_user.id,
            product_id=product_id, 
            search=search, 
            movement_type=movement_type, 
            start_date=start_date,
            end_date=end_date,
            include_cancelled=include_cancelled,
            skip=skip, 
            limit=limit
        )
        return {
            "items": items,
            "total": total,
            "page": (skip // limit) + 1,
            "per_page": limit
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro crítico ao listar movimentações")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/stock-levels", response_model=StockLevelPaginatedResponse)
@limiter.limit("200/minute")
def get_stock_levels(
    request: Request, 
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    sort_by: str = Query("product_name"),
    order: str = Query("asc"),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    try:
        items, total = crud.get_stock_levels(
            db, 
            user_id=current_user.id,
            skip=skip,
            limit=limit,
            search=search,
            sort_by=sort_by,
            order=order
        )
        return {
            "items": items,
            "total": total,
            "page": (skip // limit) + 1,
            "per_page": limit
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro crítico ao buscar níveis de estoque")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/dashboard-summary")
@limiter.limit("120/minute")
def dashboard_summary(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Endpoint leve para o Dashboard — retorna apenas contagens, sem dados pesados."""
    try:
        return crud.get_dashboard_summary(db, user_id=current_user.id)
    except Exception as e:
        logger.exception("Erro ao buscar resumo do dashboard")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/reports/daily")
@limiter.limit("30/minute")
def get_daily_reports(
    request: Request,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    movement_type: Optional[MovementType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return crud.get_daily_reports(
            db, 
            user_id=current_user.id, 
            start_date=start_date, 
            end_date=end_date,
            movement_type=movement_type
        )
    except Exception as e:
        logger.exception("Erro crítico ao gerar relatório diário")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

@router.post("/movements/{movement_id}/cancel", response_model=InventoryMovementResponse)
@limiter.limit("30/minute")
def cancel_movement(
    request: Request,
    movement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        db_movement = crud.cancel_movement(db, movement_id, user_id=current_user.id)
        if not db_movement:
            raise HTTPException(status_code=404, detail="Movimentação não encontrada")
        logger.info(f"Usuário {current_user.email} cancelou movimentação ID={movement_id}")
        return db_movement
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Erro crítico ao cancelar movimentação")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
