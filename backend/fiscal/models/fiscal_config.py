"""Configuração fiscal do emitente (dados do CNPJ que emite a NF-e)."""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from backend.core.database import Base


class FiscalConfig(Base):
    __tablename__ = "fiscal_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    cnpj = Column(String(14), nullable=False)
    razao_social = Column(String(150), nullable=False)
    nome_fantasia = Column(String(150), nullable=True)
    inscricao_estadual = Column(String(20), nullable=False)
    inscricao_municipal = Column(String(20), nullable=True)
    cnae_fiscal = Column(String(7), nullable=True)
    regime_tributario = Column(String(2), nullable=False, default="1")  # RegimeTributario

    # Endereço
    logradouro = Column(String(150), nullable=False)
    numero = Column(String(10), nullable=False)
    complemento = Column(String(60), nullable=True)
    bairro = Column(String(60), nullable=False)
    municipio = Column(String(60), nullable=False)
    cod_municipio_ibge = Column(String(7), nullable=False)
    uf = Column(String(2), nullable=False)
    cep = Column(String(8), nullable=False)

    # Operação
    serie_padrao = Column(Integer, nullable=False, default=1)
    proximo_numero = Column(Integer, nullable=False, default=1)
    ambiente = Column(String(20), nullable=False, default="homologacao")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", name="uix_fiscal_config_user"),
    )
