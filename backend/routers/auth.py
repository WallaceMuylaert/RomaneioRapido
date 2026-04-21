from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import verify_password, create_access_token, get_current_user, get_password_hash
from backend.core.config import settings
from backend.core.limiter import limiter
from backend.crud.users import get_user_by_email
from backend.schemas.auth import Token, LoginRequest, UserResponse, UserUpdate, ForgotPasswordRequest, ResetPasswordRequest
from backend.models.users import User
from backend.config.logger import get_dynamic_logger

logger = get_dynamic_logger("auth")

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=Token)
@limiter.limit("15/minute")
def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    # Extrair contexto de rede
    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    user_agent = (request.headers.get("user-agent") or "-")[:120]

    try:
        user = get_user_by_email(db, login_data.email)
        if not user or not verify_password(login_data.password, user.hashed_password):
            logger.warning(
                f"Falha de login: credenciais inválidas para {login_data.email} "
                f"| IP: {client_ip} | UA: {user_agent}"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha incorretos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            logger.warning(
                f"Falha de login: usuário inativo {login_data.email} "
                f"| IP: {client_ip} | UA: {user_agent}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário desativado"
            )
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        logger.info(
            f"Login bem-sucedido: {user.email} (id={user.id}) "
            f"| IP: {client_ip} | UA: {user_agent} "
            f"| Token expira em {settings.ACCESS_TOKEN_EXPIRE_MINUTES}min"
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(
            f"Erro inesperado no login para {login_data.email} "
            f"| IP: {client_ip} | UA: {user_agent} | Error: {e}"
        )
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get("/me", response_model=UserResponse)
@limiter.limit("120/minute")
def get_me(request: Request, current_user: User = Depends(get_current_user)):
    try:
        from backend.core.trial_utils import is_trial_expired, get_trial_days_remaining

        user_data = UserResponse.model_validate(current_user)
        user_data.trial_expired = is_trial_expired(current_user)
        user_data.trial_days_remaining = get_trial_days_remaining(current_user)
        user_data.subscription_status = getattr(current_user, 'subscription_status', 'active') or 'active'
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro ao buscar dados do usuário {current_user.email}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.put("/me", response_model=UserResponse)
@limiter.limit("60/minute")
def update_me(request: Request, update_data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        if update_data.full_name is not None:
            current_user.full_name = update_data.full_name
        if update_data.email is not None:
            current_user.email = update_data.email
        if update_data.phone is not None:
            current_user.phone = update_data.phone
        if update_data.store_name is not None:
            current_user.store_name = update_data.store_name
        if update_data.photo_base64 is not None:
            current_user.photo_base64 = update_data.photo_base64
        if update_data.pix_key is not None:
            current_user.pix_key = update_data.pix_key
        if update_data.password:
            current_user.hashed_password = get_password_hash(update_data.password)
            
        db.commit()
        db.refresh(current_user)
        logger.info(f"Usuário {current_user.email} atualizou o perfil.")
        return current_user
    except Exception as e:
        db.rollback()
        logger.exception("Erro ao atualizar perfil do usuário")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, data: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        user = get_user_by_email(db, data.email)
        if user:
            import uuid
            from datetime import datetime, timedelta
            from backend.core.mail_utils import send_reset_password_email
            
            token = str(uuid.uuid4())
            user.reset_token = token
            user.reset_token_expires = datetime.now() + timedelta(minutes=30)
            db.commit()
            
            # Executa o envio de e-mail em segundo plano para evitar 502/Timeout
            background_tasks.add_task(send_reset_password_email, user.email, token)
            logger.info(f"Solicitação de recuperação de senha para {user.email} - e-mail enviado via background task.")
        else:
            # Log interno para depuração (não revelado ao frontend)
            logger.warning(f"Solicitação de recuperação de senha ignorada: email {data.email} não encontrado no banco.")
            
        # Mesmo que o usuário não exista, retornamos sucesso por segurança (impedir enumeração)
        return {"message": "Se o e-mail existir em nossa base, um link de recuperação será enviado."}
    except Exception as e:
        db.rollback()
        logger.exception(f"Erro no forgot-password para {data.email}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, data: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        from datetime import datetime
        user = db.query(User).filter(
            User.reset_token == data.token,
            User.reset_token_expires > datetime.now()
        ).first()
        
        if not user:
            raise HTTPException(status_code=400, detail="Token inválido ou expirado")
            
        user.hashed_password = get_password_hash(data.new_password)
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()
        
        logger.info(f"Senha redefinida com sucesso para o usuário {user.email}")
        return {"message": "Senha redefinida com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Erro crítico no reset-password")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.post("/refresh", response_model=Token)
@limiter.limit("5/minute")
def refresh_token(request: Request, current_user: User = Depends(get_current_user)):
    try:
        from datetime import timedelta
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": current_user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        logger.exception(f"Erro ao atualizar token para {current_user.email}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
