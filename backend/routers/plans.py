from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.routers.auth import get_current_user
from backend.models.users import User
from backend.models.products import Product
from backend.models.categories import Category
from pydantic import BaseModel
from backend.core.plans_config import PLANS_CONFIG

router = APIRouter(prefix="/plans")

class SubscribeRequest(BaseModel):
    plan_id: str

@router.get("/usage")
def get_usage(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product_count = db.query(Product).count()
    category_count = db.query(Category).count()
    
    plan = PLANS_CONFIG.get(current_user.plan_id, PLANS_CONFIG["trial"])
    
    return {
        "products": {
            "used": product_count,
            "limit": plan["limit_products"]
        },
        "categories": {
            "used": category_count,
            "limit": plan["limit_categories"]
        },
        "plan_id": current_user.plan_id
    }

@router.patch("/subscribe")
def subscribe(request: SubscribeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if request.plan_id not in PLANS_CONFIG:
        raise HTTPException(status_code=400, detail="Plano inválido")
    
    current_user.plan_id = request.plan_id
    db.commit()
    return {"message": f"Assinatura atualizada para {request.plan_id}", "plan_id": request.plan_id}
