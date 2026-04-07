from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.models.users import User
from backend.core.security import get_password_hash


def get_user_by_email(db: Session, email: str):
    if email:
        email = email.strip().lower()
    return db.query(User).filter(func.lower(User.email) == email).first()


def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()


def create_user(db: Session, email: str, password: str, full_name: str, is_admin: bool = False):
    hashed_password = get_password_hash(password)
    db_user = User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        is_admin=is_admin,
        plan_id="enterprise" if is_admin else "trial"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
