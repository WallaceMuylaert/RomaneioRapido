"""Repositório da configuração fiscal do emitente."""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from backend.fiscal.models.fiscal_config import FiscalConfig


class FiscalConfigRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_user(self, user_id: int) -> Optional[FiscalConfig]:
        return self._db.query(FiscalConfig).filter(FiscalConfig.user_id == user_id).first()

    def upsert(self, user_id: int, data: dict) -> FiscalConfig:
        existing = self.get_by_user(user_id)
        if existing:
            for key, value in data.items():
                setattr(existing, key, value)
            self._db.commit()
            self._db.refresh(existing)
            return existing
        config = FiscalConfig(user_id=user_id, **data)
        self._db.add(config)
        self._db.commit()
        self._db.refresh(config)
        return config

    def reserve_next_number(self, user_id: int) -> tuple[int, int]:
        """Reserva e incrementa o próximo número de NF-e do emitente.

        Retorna (numero, serie). Uso atômico via SELECT FOR UPDATE.
        """
        config = (
            self._db.query(FiscalConfig)
            .filter(FiscalConfig.user_id == user_id)
            .with_for_update()
            .first()
        )
        if not config:
            raise ValueError("Configuração fiscal não encontrada.")
        numero = config.proximo_numero
        config.proximo_numero = numero + 1
        self._db.commit()
        self._db.refresh(config)
        return numero, config.serie_padrao
