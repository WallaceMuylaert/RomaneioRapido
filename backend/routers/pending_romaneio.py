from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.schemas.pending_romaneio import PendingRomaneio, PendingRomaneioCreate, PendingRomaneioUpdate
from backend.crud import pending_romaneio as crud

router = APIRouter(prefix="/pending", tags=["pending"])


@router.get("/", response_model=List[PendingRomaneio])
def read_pending_romaneios(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return crud.get_pending_romaneios(db, user_id=current_user.id)


@router.get("/{pending_id}", response_model=PendingRomaneio)
def read_pending_romaneio(
    pending_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_pending = crud.get_pending_romaneio(db, pending_id=pending_id, user_id=current_user.id)
    if not db_pending:
        raise HTTPException(status_code=404, detail="Rascunho não encontrado")
    return db_pending


@router.post("/", response_model=PendingRomaneio)
def create_pending_romaneio(
    pending: PendingRomaneioCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return crud.create_pending_romaneio(db=db, pending=pending, user_id=current_user.id)


@router.put("/{pending_id}", response_model=PendingRomaneio)
def update_pending_romaneio(
    pending_id: int,
    pending: PendingRomaneioUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_pending = crud.update_pending_romaneio(db=db, pending_id=pending_id, pending=pending, user_id=current_user.id)
    if not db_pending:
        raise HTTPException(status_code=404, detail="Rascunho não encontrado")
    return db_pending


@router.delete("/{pending_id}")
def delete_pending_romaneio(
    pending_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    success = crud.delete_pending_romaneio(db=db, pending_id=pending_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Rascunho não encontrado")
    return {"detail": "Rascunho removido com sucesso"}
