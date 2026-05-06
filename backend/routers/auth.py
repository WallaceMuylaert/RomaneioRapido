from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, BackgroundTasks
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.auth_tokens import (
    clear_refresh_cookie,
    create_refresh_session,
    get_active_refresh_session,
    hash_token,
    mark_user_credentials_changed,
    revoke_refresh_token,
    rotate_refresh_session,
    set_refresh_cookie,
)
from backend.core.security import verify_password, create_user_access_token, get_current_user, get_password_hash
from backend.core.config import settings
from backend.core.limiter import limiter
from backend.crud.users import get_user_by_email
from backend.schemas.auth import Token, LoginRequest, UserResponse, UserUpdate, ForgotPasswordRequest, ResetPasswordRequest
from backend.models.users import User
from backend.config.logger import get_dynamic_logger
from backend.utils.images import compress_image_base64

logger = get_dynamic_logger("auth")

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=Token)
@limiter.limit("15/minute")
def login(request: Request, response: Response, login_data: LoginRequest, db: Session = Depends(get_db)):
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
        access_token = create_user_access_token(user, expires_delta=access_token_expires)
        refresh_token = create_refresh_session(db, user, request)
        set_refresh_cookie(response, refresh_token)
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
            existing = get_user_by_email(db, update_data.email)
            if existing and existing.id != current_user.id:
                raise HTTPException(status_code=400, detail="Este e-mail já está em uso.")
            current_user.email = update_data.email
        if update_data.phone is not None:
            current_user.phone = update_data.phone
        if update_data.store_name is not None:
            current_user.store_name = update_data.store_name
        if update_data.photo_base64 is not None:
            current_user.photo_base64 = compress_image_base64(update_data.photo_base64)
        if update_data.pix_key is not None:
            current_user.pix_key = update_data.pix_key
        if update_data.password:
            current_user.hashed_password = get_password_hash(update_data.password)
            mark_user_credentials_changed(db, current_user)
            
        db.commit()
        db.refresh(current_user)
        logger.info(f"Usuário {current_user.email} atualizou o perfil.")
        return current_user
    except HTTPException:
        raise
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
            import secrets
            from backend.core.mail_utils import send_reset_password_email
            
            token = secrets.token_urlsafe(48)
            user.reset_token = hash_token(token)
            user.reset_token_expires = datetime.now(timezone.utc) + timedelta(minutes=30)
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
        from sqlalchemy import or_
        token_hash = hash_token(data.token)
        user = db.query(User).filter(
            or_(User.reset_token == token_hash, User.reset_token == data.token),
            User.reset_token_expires > datetime.now(timezone.utc)
        ).first()
        
        if not user:
            raise HTTPException(status_code=400, detail="Token inválido ou expirado")
            
        user.hashed_password = get_password_hash(data.new_password)
        mark_user_credentials_changed(db, user)
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
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        current_user = None
        refresh_cookie = request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
        if refresh_cookie:
            refresh_session = get_active_refresh_session(db, refresh_cookie)
            if not refresh_session or not refresh_session.user or not refresh_session.user.is_active:
                clear_refresh_cookie(response)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Sessao expirada ou invalida",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            current_user = refresh_session.user
            new_refresh_token = rotate_refresh_session(db, refresh_session, request)
            set_refresh_cookie(response, new_refresh_token)
        else:
            auth = request.headers.get("authorization", "")
            if not auth.startswith("Bearer "):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Sessao expirada ou invalida",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            from backend.core.security import get_current_user as _get_current_user
            current_user = _get_current_user(request, auth[7:], db)

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_user_access_token(current_user, expires_delta=access_token_expires)
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        user_email = getattr(current_user, "email", "unknown")
        logger.exception(f"Erro ao atualizar token para {user_email}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.post("/logout")
@limiter.limit("30/minute")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_cookie = request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if refresh_cookie:
        revoke_refresh_token(db, refresh_cookie)
    clear_refresh_cookie(response)
    return {"message": "Sessao encerrada com sucesso"}
