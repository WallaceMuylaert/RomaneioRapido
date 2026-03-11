from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.limiter import limiter
from backend.crud.users import create_user, get_user_by_email
from backend.schemas.auth import UserCreate, UserResponse
from backend.config.logger import get_dynamic_logger

logger = get_dynamic_logger("users")

router = APIRouter(prefix="/users")

@router.post("/", response_model=UserResponse)
@limiter.limit("5/minute")
def register_user(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    try:
        user = get_user_by_email(db, user_in.email)
        if user:
            raise HTTPException(
                status_code=400,
                detail="O email já está em uso."
            )
        
        new_user = create_user(
            db=db,
            email=user_in.email,
            password=user_in.password,
            full_name=user_in.full_name
        )
        logger.info(f"Novo usuário registrado: {new_user.email}")
        return new_user
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Erro crítico ao registrar usuário")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
