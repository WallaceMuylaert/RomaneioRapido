"""DTOs Pydantic para configuração fiscal do emitente."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class FiscalConfigBase(BaseModel):
    cnpj: str = Field(..., min_length=11, max_length=18)
    razao_social: str = Field(..., min_length=2, max_length=150)
    nome_fantasia: Optional[str] = Field(None, max_length=150)
    inscricao_estadual: str = Field(..., min_length=2, max_length=20)
    inscricao_municipal: Optional[str] = Field(None, max_length=20)
    cnae_fiscal: Optional[str] = Field(None, max_length=10)
    regime_tributario: str = Field("1", pattern=r"^[1-4]$")

    logradouro: str = Field(..., min_length=2, max_length=150)
    numero: str = Field(..., max_length=10)
    complemento: Optional[str] = Field(None, max_length=60)
    bairro: str = Field(..., min_length=2, max_length=60)
    municipio: str = Field(..., min_length=2, max_length=60)
    cod_municipio_ibge: str = Field(..., min_length=7, max_length=7)
    uf: str = Field(..., min_length=2, max_length=2)
    cep: str = Field(..., min_length=8, max_length=9)

    serie_padrao: int = Field(1, ge=1, le=999)
    proximo_numero: int = Field(1, ge=1)
    ambiente: str = Field("homologacao", pattern=r"^(homologacao|producao)$")


class FiscalConfigCreate(FiscalConfigBase):
    pass


class FiscalConfigResponse(FiscalConfigBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
