from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.core.database import get_db
from backend.core.security import get_current_superadmin, get_password_hash
from backend.models.users import User
from backend.schemas.auth import UserResponse, UserUpdate
from backend.config.logger import get_dynamic_logger

logger = get_dynamic_logger("admin")

router = APIRouter(prefix="/admin", dependencies=[Depends(get_current_superadmin)])

@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """Lista todos os usuários do sistema (apenas Super Admin)."""
    try:
        users = db.query(User).all()
        return users
    except Exception as e:
        logger.exception("Erro ao listar usuários para o Super Admin")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar usuários")

@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user_system(
    user_id: int, 
    update_data: UserUpdate, 
    db: Session = Depends(get_db)
):
    """Atualiza dados sensíveis de qualquer usuário (plano, senha, is_admin, is_active)."""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        if update_data.password is not None:
            user.hashed_password = get_password_hash(update_data.password)
        if update_data.plan_id is not None:
            user.plan_id = update_data.plan_id
        if update_data.is_active is not None:
            user.is_active = update_data.is_active
        if update_data.is_admin is not None:
            user.is_admin = update_data.is_admin

        db.commit()
        db.refresh(user)
        logger.info(f"Super Admin atualizou o usuário {user.email}")
        return user
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"Erro ao atualizar usuário {user_id} pelo Super Admin")
        raise HTTPException(status_code=500, detail="Erro interno ao atualizar usuário")

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_system(user_id: int, db: Session = Depends(get_db)):
    """Remove um usuário do sistema permanentemente."""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        db.delete(user)
        db.commit()
        logger.info(f"Super Admin removeu o usuário {user_id}")
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception(f"Erro ao remover usuário {user_id} pelo Super Admin")
        raise HTTPException(status_code=500, detail="Erro interno ao remover usuário")
