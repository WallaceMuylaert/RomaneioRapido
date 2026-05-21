"""CertificateService: ciclo de vida do certificado A1.

Responsabilidades:
    - Validar PFX + senha
    - Extrair metadados (sujeito, emissor, validade)
    - Persistir cifrado em repouso (via CryptoService + repository)
    - Fornecer material em claro (apenas em memória) ao motor de assinatura

Não conhece SQLAlchemy diretamente — recebe um repositório por DI.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from cryptography.hazmat.primitives.serialization import pkcs12

from backend.fiscal.domain.exceptions import (
    CertificateError,
    CertificateExpiredError,
    CertificateInvalidError,
    CertificateNotFoundError,
)
from backend.fiscal.models.certificate import FiscalCertificate
from backend.fiscal.repositories.certificate_repository import CertificateRepository

from .crypto_service import CryptoService


@dataclass(frozen=True)
class CertificateMaterial:
    """Material em claro do certificado, mantido apenas em memória."""
    pfx_bytes: bytes
    password: str
    subject_cn: Optional[str]
    not_after: Optional[datetime]


@dataclass(frozen=True)
class CertificateMetadata:
    subject_cn: Optional[str]
    issuer_cn: Optional[str]
    serial_number: Optional[str]
    not_before: Optional[datetime]
    not_after: Optional[datetime]


class CertificateService:
    def __init__(
        self,
        repository: CertificateRepository,
        crypto: CryptoService,
    ) -> None:
        self._repo = repository
        self._crypto = crypto

    # ── Public API ──────────────────────────────────────────────────────────
    def upload(self, *, user_id: int, filename: str, pfx_bytes: bytes, password: str) -> FiscalCertificate:
        metadata = self._extract_metadata(pfx_bytes, password)
        self._ensure_not_expired(metadata.not_after)

        encrypted_pfx = self._crypto.encrypt(pfx_bytes)
        encrypted_password = self._crypto.encrypt_text(password)

        return self._repo.upsert(
            user_id=user_id,
            filename=filename,
            encrypted_pfx=encrypted_pfx,
            encrypted_password=encrypted_password,
            metadata=metadata,
        )

    def get_metadata(self, user_id: int) -> FiscalCertificate:
        cert = self._repo.get_by_user(user_id)
        if not cert:
            raise CertificateNotFoundError("Nenhum certificado A1 cadastrado.")
        return cert

    def load_material(self, user_id: int) -> CertificateMaterial:
        cert = self.get_metadata(user_id)
        self._ensure_not_expired(cert.not_after)
        return CertificateMaterial(
            pfx_bytes=self._crypto.decrypt(cert.encrypted_pfx),
            password=self._crypto.decrypt_text(cert.encrypted_password),
            subject_cn=cert.subject_cn,
            not_after=cert.not_after,
        )

    def delete(self, user_id: int) -> bool:
        return self._repo.delete_by_user(user_id)

    # ── Internals ───────────────────────────────────────────────────────────
    @staticmethod
    def _extract_metadata(pfx_bytes: bytes, password: str) -> CertificateMetadata:
        try:
            _key, cert, _chain = pkcs12.load_key_and_certificates(
                pfx_bytes, password.encode("utf-8")
            )
        except ValueError as exc:
            raise CertificateInvalidError(
                "Não foi possível abrir o certificado: senha incorreta ou arquivo inválido."
            ) from exc
        except Exception as exc:  # noqa: BLE001 — qualquer falha do PKCS12 é "inválido"
            raise CertificateInvalidError(
                "Arquivo PFX inválido."
            ) from exc

        if cert is None:
            raise CertificateInvalidError("PFX não contém certificado.")

        def _cn(name) -> Optional[str]:
            try:
                attrs = name.rfc4514_string()
                return attrs
            except Exception:
                return None

        return CertificateMetadata(
            subject_cn=_cn(cert.subject),
            issuer_cn=_cn(cert.issuer),
            serial_number=str(cert.serial_number),
            not_before=cert.not_valid_before.replace(tzinfo=timezone.utc),
            not_after=cert.not_valid_after.replace(tzinfo=timezone.utc),
        )

    @staticmethod
    def _ensure_not_expired(not_after: Optional[datetime]) -> None:
        if not_after is None:
            return
        if not_after < datetime.now(timezone.utc):
            raise CertificateExpiredError("Certificado A1 expirado.")
