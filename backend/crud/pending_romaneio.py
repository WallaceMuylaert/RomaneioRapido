from sqlalchemy.orm import Session
from backend.models.pending_romaneio import PendingRomaneio
from backend.schemas.pending_romaneio import PendingRomaneioCreate, PendingRomaneioUpdate


def get_pending_romaneios(db: Session, user_id: int):
    return db.query(PendingRomaneio).filter(PendingRomaneio.user_id == user_id).all()


def get_pending_romaneio(db: Session, pending_id: int, user_id: int):
    return db.query(PendingRomaneio).filter(
        PendingRomaneio.id == pending_id, 
        PendingRomaneio.user_id == user_id
    ).first()


def create_pending_romaneio(db: Session, pending: PendingRomaneioCreate, user_id: int):
    db_pending = PendingRomaneio(
        **pending.model_dump(),
        user_id=user_id
    )
    db.add(db_pending)
    db.commit()
    db.refresh(db_pending)
    return db_pending


def update_pending_romaneio(db: Session, pending_id: int, pending: PendingRomaneioUpdate, user_id: int):
    db_pending = get_pending_romaneio(db, pending_id, user_id)
    if not db_pending:
        return None
    
    update_data = pending.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_pending, key, value)
    
    db.commit()
    db.refresh(db_pending)
    return db_pending


def delete_pending_romaneio(db: Session, pending_id: int, user_id: int):
    db_pending = get_pending_romaneio(db, pending_id, user_id)
    if not db_pending:
        return False
    
    db.delete(db_pending)
    db.commit()
    return True
