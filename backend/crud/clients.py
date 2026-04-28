from sqlalchemy.orm import Session
from backend.models.clients import Client
from backend.models.inventory import InventoryMovement
from backend.models.pending_romaneio import PendingRomaneio
from backend.schemas.clients import ClientCreate, ClientUpdate
from typing import Optional

def get_clients(db: Session, user_id: int, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    query = db.query(Client).filter(Client.user_id == user_id)
    if search:
        query = query.filter(
            (Client.name.ilike(f"%{search}%")) |
            (Client.phone.ilike(f"%{search}%")) |
            (Client.document.ilike(f"%{search}%"))
        )
    return query.order_by(Client.name.asc()).offset(skip).limit(limit).all()

def count_clients(db: Session, user_id: int, search: Optional[str] = None):
    query = db.query(Client).filter(Client.user_id == user_id)
    if search:
        query = query.filter(
            (Client.name.ilike(f"%{search}%")) |
            (Client.phone.ilike(f"%{search}%")) |
            (Client.document.ilike(f"%{search}%"))
        )
    return query.count()

def get_client(db: Session, client_id: int, user_id: int):
    return db.query(Client).filter(Client.id == client_id, Client.user_id == user_id).first()

def create_client(db: Session, client: ClientCreate, user_id: int):
    db_client = Client(**client.model_dump(), user_id=user_id)
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

def update_client(db: Session, client_id: int, client: ClientUpdate, user_id: int):
    db_client = get_client(db, client_id, user_id)
    if not db_client:
        return None
    
    update_data = client.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_client, key, value)
        
    db.commit()
    db.refresh(db_client)
    return db_client

def delete_client(db: Session, client_id: int, user_id: int):
    db_client = get_client(db, client_id, user_id)
    if not db_client:
        return None

    deleted_client = {
        "id": db_client.id,
        "user_id": db_client.user_id,
        "name": db_client.name,
        "phone": db_client.phone,
        "document": db_client.document,
        "email": db_client.email,
        "notes": db_client.notes,
        "created_at": db_client.created_at,
        "updated_at": db_client.updated_at,
    }

    db.query(PendingRomaneio).filter(
        PendingRomaneio.user_id == user_id,
        PendingRomaneio.client_id == client_id,
    ).update({PendingRomaneio.client_id: None}, synchronize_session=False)
    db.query(InventoryMovement).filter(
        InventoryMovement.created_by == user_id,
        InventoryMovement.client_id == client_id,
    ).update({InventoryMovement.client_id: None}, synchronize_session=False)

    db.delete(db_client)
    db.commit()
    return deleted_client
