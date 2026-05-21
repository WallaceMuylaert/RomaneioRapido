"""Repositório das NF-e e seus itens."""
from __future__ import annotations

from typing import Optional, Sequence

from sqlalchemy.orm import Session

from backend.fiscal.models.nfe import NFe, NFeItem


class NFeRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(self, nfe: NFe) -> NFe:
        self._db.add(nfe)
        self._db.commit()
        self._db.refresh(nfe)
        return nfe

    def save(self, nfe: NFe) -> NFe:
        self._db.commit()
        self._db.refresh(nfe)
        return nfe

    def get(self, user_id: int, nfe_id: int) -> Optional[NFe]:
        return (
            self._db.query(NFe)
            .filter(NFe.id == nfe_id, NFe.user_id == user_id)
            .first()
        )

    def list_by_user(
        self,
        user_id: int,
        *,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
    ) -> Sequence[NFe]:
        query = self._db.query(NFe).filter(NFe.user_id == user_id)
        if status:
            query = query.filter(NFe.status == status)
        return (
            query.order_by(NFe.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_by_user(self, user_id: int, *, status: Optional[str] = None) -> int:
        query = self._db.query(NFe).filter(NFe.user_id == user_id)
        if status:
            query = query.filter(NFe.status == status)
        return query.count()
