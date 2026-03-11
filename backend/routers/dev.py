import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.routers.auth import get_current_user
from backend.models.users import User
from backend.core.plans_config import PLANS_CONFIG

router = APIRouter(prefix="/dev", tags=["Development"])

@router.post("/set-plan/{plan_id}")
def set_user_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint para uso EXCLUSIVO em desenvolvimento.
    Permite trocar o plano do usuário logado instantaneamente.
    """
    if os.getenv("ENVIRONMENT", "development").lower() != "development":
        raise HTTPException(
            status_code=403, 
            detail="Este endpoint só está disponível em modo de desenvolvimento."
        )
    
    if plan_id not in PLANS_CONFIG:
        raise HTTPException(status_code=400, detail=f"Plano '{plan_id}' inválido.")
        
    try:
        current_user.plan_id = plan_id
        db.commit()
        return {"message": f"Plano alterado para {plan_id} com sucesso!", "plan_id": plan_id}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
