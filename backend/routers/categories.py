from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.core.trial_utils import require_active_plan
from backend.core.limiter import limiter
from backend.models.users import User
from backend.schemas.categories import CategoryCreate, CategoryUpdate, CategoryResponse, ReorderRequest
from backend.crud import categories as crud
from backend.models.categories import Category
from backend.config.logger import get_dynamic_logger
from backend.core.plans_config import PLANS_CONFIG

logger = get_dynamic_logger("categories")

router = APIRouter(prefix="/categories")


@router.get("/", response_model=List[CategoryResponse])
@limiter.limit("200/minute")
def list_categories(request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return crud.get_categories(db, user_id=current_user.id, skip=skip, limit=limit)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar categorias: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/{category_id}", response_model=CategoryResponse)
@limiter.limit("200/minute")
def get_category(request: Request, category_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        category = crud.get_category(db, category_id, user_id=current_user.id)
        if not category:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        return category
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar categoria ID={category_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.post("/", response_model=CategoryResponse)
@limiter.limit("30/minute")
def create_category(request: Request, category: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(require_active_plan)):
    try:
        # Validação de Limite do Plano
        plan = PLANS_CONFIG.get(current_user.plan_id, PLANS_CONFIG["trial"])
        current_count = db.query(Category).filter(Category.user_id == current_user.id).count()
        if current_count >= plan["limit_categories"]:
            raise HTTPException(
                status_code=403, 
                detail=f"Limite de categorias atingido para o plano {current_user.plan_id.capitalize()}. (Limite: {plan['limit_categories']})"
            )

        logger.info(f"Usuário {current_user.email} criando categoria: {category.name}")
        return crud.create_category(db, category, user_id=current_user.id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar categoria: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.post("/reorder")
@limiter.limit("60/minute")
def reorder_categories(request: Request, reorder_request: ReorderRequest, db: Session = Depends(get_db), current_user: User = Depends(require_active_plan)):
    try:
        logger.info(f"Usuário {current_user.email} reordenou {len(reorder_request.items)} categorias")
        crud.reorder_categories(db, reorder_request.items, user_id=current_user.id)
        return {"detail": "Ordem atualizada com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao reordenar categorias: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.put("/{category_id}", response_model=CategoryResponse)
@limiter.limit("60/minute")
def update_category(request: Request, category_id: int, category: CategoryUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_active_plan)):
    try:
        logger.info(f"Usuário {current_user.email} atualizou categoria ID={category_id}")
        updated = crud.update_category(db, category_id, category, user_id=current_user.id)
        if not updated:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar categoria ID={category_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.delete("/{category_id}", response_model=CategoryResponse)
@limiter.limit("30/minute")
def delete_category(request: Request, category_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_active_plan)):
    try:
        logger.warning(f"Usuário {current_user.email} deletou a categoria ID={category_id}")
        deleted = crud.delete_category(db, category_id, user_id=current_user.id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        return deleted
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao deletar categoria ID={category_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
