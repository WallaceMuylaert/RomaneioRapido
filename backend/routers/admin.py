from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.core.database import get_db
from backend.core.limiter import limiter
from backend.core.security import get_current_superadmin, get_password_hash
from backend.models.users import User
from backend.schemas.auth import UserResponse, UserUpdate, PaginatedUserResponse
from backend.schemas.admin import BulkEmailRequest, BulkEmailResponse
from backend.core.mail_utils import send_admin_bulk_email
from backend.core.trial_utils import is_trial_expired, get_trial_days_remaining
from backend.config.logger import get_dynamic_logger

logger = get_dynamic_logger("admin")

router = APIRouter(prefix="/admin", dependencies=[Depends(get_current_superadmin)])

@router.get("/users", response_model=PaginatedUserResponse)
def list_users(
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    plan: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista todos os usuários do sistema com paginação e filtros (apenas Super Admin)."""
    try:
        query = db.query(User)
        
        if search:
            query = query.filter(
                (User.full_name.ilike(f"%{search}%")) | 
                (User.email.ilike(f"%{search}%"))
            )
            
        if plan and plan != 'all':
            query = query.filter(User.plan_id == plan)

        total = query.count()
        pages = (total + size - 1) // size
        skip = (page - 1) * size
        
        users = query.order_by(User.created_at.desc()).offset(skip).limit(size).all()
        
        # Injetar informações de trial em tempo de execução
        for u in users:
            u.trial_expired = is_trial_expired(u)
            u.trial_days_remaining = get_trial_days_remaining(u)
            
        return {
            "items": users,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages
        }
    except Exception as e:
        logger.exception("Erro ao listar usuários para o Super Admin")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar usuários")

@router.post("/users/bulk-email", response_model=BulkEmailResponse)
@limiter.limit("3/hour")
def send_bulk_email_to_users(
    request: Request,
    email_data: BulkEmailRequest,
    db: Session = Depends(get_db),
):
    """Envia e-mail em massa para usuários cadastrados (apenas Super Admin)."""
    try:
        query = db.query(User).filter(User.email.isnot(None))

        if email_data.recipient_scope == "active":
            query = query.filter(User.is_active == True)
        elif email_data.recipient_scope == "inactive":
            query = query.filter(User.is_active == False)

        if email_data.plan_id:
            query = query.filter(User.plan_id == email_data.plan_id)

        if email_data.exclude_admins:
            query = query.filter(User.is_admin == False)

        users = query.order_by(User.id.asc()).all()

        recipients_by_email = {}
        for user in users:
            email = (user.email or "").strip().lower()
            if email:
                recipients_by_email[email] = user.full_name or email

        recipients = list(recipients_by_email.items())
        if not recipients:
            raise HTTPException(status_code=400, detail="Nenhum usuário encontrado para os filtros selecionados")

        result = send_admin_bulk_email(recipients, email_data.subject, email_data.message)
        logger.info(
            "Super Admin solicitou envio em massa. "
            f"Destinatários: {len(recipients)}, enviados: {result['sent']}, falhas: {result['failed']}"
        )

        if not result["smtp_configured"]:
            raise HTTPException(
                status_code=503,
                detail="SMTP não configurado. Preencha SMTP_HOST, SMTP_USER e SMTP_PASS no ambiente.",
            )

        return {
            "total_recipients": len(recipients),
            "sent": result["sent"],
            "failed": result["failed"],
            "failed_emails": result["failed_emails"],
            "smtp_configured": result["smtp_configured"],
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erro ao enviar e-mail em massa")
        raise HTTPException(status_code=500, detail="Erro interno ao enviar e-mail em massa")

@router.put("/users/{user_id}", response_model=UserResponse)
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
        if update_data.trial_days is not None:
            user.trial_days = update_data.trial_days
        if update_data.is_unlimited is not None:
            user.is_unlimited = update_data.is_unlimited

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
