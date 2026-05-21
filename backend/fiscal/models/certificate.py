"""Certificado Digital A1 (PFX) armazenado cifrado em repouso.

O arquivo binário (.pfx) e a senha são cifrados pelo CryptoService antes
da persistência. A leitura em claro só ocorre em memória, durante a
assinatura do XML.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, LargeBinary, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from backend.core.database import Base


class FiscalCertificate(Base):
    __tablename__ = "fiscal_certificates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Identificação do arquivo
    filename = Column(String(255), nullable=False)
    subject_cn = Column(String(255), nullable=True)        # Sujeito do certificado (CN/OU)
    issuer_cn = Column(String(255), nullable=True)
    serial_number = Column(String(64), nullable=True)
    not_before = Column(DateTime(timezone=True), nullable=True)
    not_after = Column(DateTime(timezone=True), nullable=True)

    # Conteúdo cifrado
    encrypted_pfx = Column(LargeBinary, nullable=False)    # bytes do .pfx cifrados (Fernet)
    encrypted_password = Column(LargeBinary, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", name="uix_fiscal_certificate_user"),
    )
