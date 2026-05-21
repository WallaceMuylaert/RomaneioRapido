"""Repositório do certificado A1: acesso a dados puro (SRP).

O service de domínio depende desta interface — facilita testes e troca
do storage subjacente sem alterar a regra de negócio (DIP).
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from sqlalchemy.orm import Session

from backend.fiscal.models.certificate import FiscalCertificate

if TYPE_CHECKING:
    from backend.fiscal.services.certificate_service import CertificateMetadata


class CertificateRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_user(self, user_id: int) -> Optional[FiscalCertificate]:
        return (
            self._db.query(FiscalCertificate)
            .filter(FiscalCertificate.user_id == user_id)
            .first()
        )

    def upsert(
        self,
        *,
        user_id: int,
        filename: str,
        encrypted_pfx: bytes,
        encrypted_password: bytes,
        metadata: "CertificateMetadata",
    ) -> FiscalCertificate:
        existing = self.get_by_user(user_id)
        if existing:
            existing.filename = filename
            existing.encrypted_pfx = encrypted_pfx
            existing.encrypted_password = encrypted_password
            existing.subject_cn = metadata.subject_cn
            existing.issuer_cn = metadata.issuer_cn
            existing.serial_number = metadata.serial_number
            existing.not_before = metadata.not_before
            existing.not_after = metadata.not_after
            self._db.commit()
            self._db.refresh(existing)
            return existing

        cert = FiscalCertificate(
            user_id=user_id,
            filename=filename,
            encrypted_pfx=encrypted_pfx,
            encrypted_password=encrypted_password,
            subject_cn=metadata.subject_cn,
            issuer_cn=metadata.issuer_cn,
            serial_number=metadata.serial_number,
            not_before=metadata.not_before,
            not_after=metadata.not_after,
        )
        self._db.add(cert)
        self._db.commit()
        self._db.refresh(cert)
        return cert

    def delete_by_user(self, user_id: int) -> bool:
        existing = self.get_by_user(user_id)
        if not existing:
            return False
        self._db.delete(existing)
        self._db.commit()
        return True
