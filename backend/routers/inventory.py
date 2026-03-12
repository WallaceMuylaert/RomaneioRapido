from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.core.trial_utils import require_active_plan
from backend.core.limiter import limiter
from backend.models.users import User
from backend.schemas.inventory import InventoryMovementCreate, InventoryMovementResponse, StockLevel, InventoryMovementPaginatedResponse, MovementType
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
    skip: int = 0,
    limit: int = 100,
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


@router.get("/stock-levels", response_model=List[StockLevel])
@limiter.limit("200/minute")
def get_stock_levels(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return crud.get_stock_levels(db, user_id=current_user.id)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro crítico ao buscar níveis de estoque")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/reports/daily")
@limiter.limit("30/minute")
def get_daily_reports(
    request: Request,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return crud.get_daily_reports(db, user_id=current_user.id, start_date=start_date, end_date=end_date)
    except Exception as e:
        logger.exception("Erro crítico ao gerar relatório diário")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
