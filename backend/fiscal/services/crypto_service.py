"""CryptoService: criptografia simétrica em repouso para artefatos fiscais.

Usa Fernet (AES-128-CBC + HMAC-SHA256) da biblioteca `cryptography`.
A chave pode ser fornecida via `FISCAL_ENCRYPTION_KEY` (recomendado) ou
derivada do `SECRET_KEY` da aplicação como fallback determinístico.

Responsabilidade única: cifrar/decifrar bytes. Não conhece banco de dados,
não conhece NF-e, não conhece HTTP.
"""
from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from backend.core.config import settings
from backend.fiscal.domain.exceptions import CertificateError


class CryptoService:
    def __init__(self, key: bytes | None = None) -> None:
        self._fernet = Fernet(key or self._resolve_key())

    @staticmethod
    def _resolve_key() -> bytes:
        if settings.FISCAL_ENCRYPTION_KEY:
            try:
                # Aceita tanto chave Fernet pronta (44 chars) quanto string crua
                raw = settings.FISCAL_ENCRYPTION_KEY.encode("utf-8")
                base64.urlsafe_b64decode(raw)
                return raw
            except Exception:
                pass
        # Fallback: deriva da SECRET_KEY (HKDF-light com SHA-256)
        digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
        return base64.urlsafe_b64encode(digest)

    def encrypt(self, data: bytes) -> bytes:
        if not isinstance(data, (bytes, bytearray)):
            raise TypeError("encrypt espera bytes")
        return self._fernet.encrypt(bytes(data))

    def decrypt(self, token: bytes) -> bytes:
        try:
            return self._fernet.decrypt(bytes(token))
        except InvalidToken as exc:
            raise CertificateError("Falha ao decifrar artefato fiscal.") from exc

    def encrypt_text(self, text: str) -> bytes:
        return self.encrypt(text.encode("utf-8"))

    def decrypt_text(self, token: bytes) -> str:
        return self.decrypt(token).decode("utf-8")
