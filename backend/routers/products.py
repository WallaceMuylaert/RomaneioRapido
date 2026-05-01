import math
import os
from PIL import Image
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, File, UploadFile
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import get_current_user_flexible
from backend.core.trial_utils import require_active_plan_flexible
from backend.core.limiter import limiter
from backend.models.users import User
from backend.schemas.products import ProductCreate, ProductUpdate, ProductResponse, ProductSlimResponse, ProductPaginatedResponse
from backend.crud import products as crud
from backend.config.logger import get_dynamic_logger
from backend.core.plans_config import PLANS_CONFIG

logger = get_dynamic_logger("products")
router = APIRouter(prefix="/products")


@router.get("/", response_model=ProductPaginatedResponse)
@limiter.limit("200/minute")
def list_products(
    request: Request,
    page: int = Query(1, ge=1, description="Número da página"),
    per_page: int = Query(20, ge=1, le=2000, description="Itens por página"),
    search: Optional[str] = Query(None, description="Busca por nome, barcode ou SKU"),
    category_id: Optional[int] = Query(None, description="Filtrar por categoria"),
    color: Optional[str] = Query(None, description="Filtrar por cor"),
    size: Optional[str] = Query(None, description="Filtrar por tamanho"),
    sort_by: str = Query("name", description="Coluna para ordenação"),
    order: str = Query("asc", description="Ordem: asc ou desc"),
    include_images: Optional[bool] = Query(None, description="Incluir imagens base64"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_flexible)
):
    try:
        # Se não especificado, incluir imagens apenas se for uma listagem pequena (ex: página de produtos)
        # Se for listagem massiva (ex: relatório), remover imagens por performance
        if include_images is None:
            include_images = per_page <= 50

        skip = (page - 1) * per_page
        total = crud.count_products(db, user_id=current_user.id, search=search, category_id=category_id, color=color, size=size)
        db_items = crud.get_products(db, user_id=current_user.id, skip=skip, limit=per_page, search=search, category_id=category_id, color=color, size=size, sort_by=sort_by, order=order, include_images=include_images)
        pages = math.ceil(total / per_page) if total > 0 else 1
        
        # Converte explicitamente para o schema correto para evitar Erro 500 de validação
        if include_images:
            items = [ProductResponse.model_validate(i) for i in db_items]
        else:
            items = [ProductSlimResponse.model_validate(i) for i in db_items]

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pages,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro crítico ao listar produtos")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/barcode/{barcode}", response_model=ProductResponse)
@limiter.limit("200/minute")
def get_product_by_barcode(request: Request, barcode: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_flexible)):
    try:
        product = crud.get_product_by_barcode(db, barcode, user_id=current_user.id)
        if not product:
            raise HTTPException(status_code=404, detail="Produto não encontrado com este código de barras")
        return product
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro crítico ao buscar produto por barcode {barcode}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/{product_id}", response_model=ProductResponse)
@limiter.limit("200/minute")
def get_product(request: Request, product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_flexible)):
    try:
        product = crud.get_product(db, product_id, user_id=current_user.id)
        if not product:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        return product
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro crítico ao buscar produto ID={product_id}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.post("/", response_model=ProductResponse)
@limiter.limit("30/minute")
def create_product(request: Request, product: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(require_active_plan_flexible)):
    try:
        # Validação de Limite do Plano
        plan = PLANS_CONFIG.get(current_user.plan_id, PLANS_CONFIG["trial"])
        current_count = crud.count_products(db, user_id=current_user.id)
        if current_count >= plan["limit_products"]:
            raise HTTPException(
                status_code=403, 
                detail=f"Limite de produtos atingido para o plano {current_user.plan_id.capitalize()}. (Limite: {plan['limit_products']})"
            )

        logger.info(f"Usuário {current_user.email} criando novo produto: sku={product.sku} barcode={product.barcode}")
        if product.barcode:
            existing = crud.get_product_by_barcode(db, product.barcode, user_id=current_user.id)
            if existing:
                raise HTTPException(status_code=400, detail="Código de barras já cadastrado")
        if product.sku:
            existing = crud.get_product_by_sku(db, product.sku, user_id=current_user.id)
            if existing:
                raise HTTPException(status_code=400, detail="SKU já cadastrado")
        return crud.create_product(db, product, user_id=current_user.id)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Erro crítico ao criar produto")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.put("/{product_id}", response_model=ProductResponse)
@limiter.limit("60/minute")
def update_product(request: Request, product_id: int, product: ProductUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_active_plan_flexible)):
    try:
        logger.info(f"Usuário {current_user.email} modificou o produto ID={product_id}")
        updated = crud.update_product(db, product_id, product, user_id=current_user.id)
        if not updated:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"Erro crítico ao atualizar produto ID={product_id}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.delete("/{product_id}", response_model=ProductResponse)
@limiter.limit("30/minute")
def delete_product(request: Request, product_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_active_plan_flexible)):
    try:
        logger.warning(f"Usuário {current_user.email} solicitou exclusão do produto ID={product_id}")
        deleted = crud.delete_product(db, product_id, user_id=current_user.id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        return deleted
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"Erro crítico ao deletar produto ID={product_id}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
