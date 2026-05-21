"""DTOs da NF-e: rascunho, item, resposta, listagem."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class EnderecoDestinatario(BaseModel):
    logradouro: str = Field(..., max_length=150)
    numero: str = Field(..., max_length=10)
    complemento: Optional[str] = Field(None, max_length=60)
    bairro: str = Field(..., max_length=60)
    municipio: str = Field(..., max_length=60)
    cod_municipio_ibge: str = Field(..., min_length=7, max_length=7)
    uf: str = Field(..., min_length=2, max_length=2)
    cep: str = Field(..., min_length=8, max_length=9)


class DestinatarioInput(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    documento: str = Field(..., min_length=11, max_length=18)
    inscricao_estadual: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=150)
    telefone: Optional[str] = Field(None, max_length=20)
    endereco: Optional[EnderecoDestinatario] = None


class ItemInput(BaseModel):
    product_id: Optional[int] = None
    codigo: str = Field(..., max_length=60)
    descricao: str = Field(..., max_length=255)
    ncm: str = Field(..., min_length=2, max_length=10)
    cfop: str = Field(..., min_length=4, max_length=4)
    unidade_comercial: str = Field("UN", max_length=6)
    ean: Optional[str] = Field(None, max_length=14)
    quantidade: Decimal = Field(..., gt=0)
    valor_unitario: Decimal = Field(..., ge=0)
    csosn: str = Field(...)
    origem: str = Field("0", max_length=1)


class NFeDraftCreate(BaseModel):
    client_id: Optional[int] = None
    natureza_operacao: str = Field("VENDA DE MERCADORIA", max_length=60)
    finalidade: str = Field("1", pattern=r"^[1-4]$")
    tipo_operacao: str = Field("1", pattern=r"^[0-1]$")
    indicador_presenca: str = Field("1", pattern=r"^[0-9]$")
    informacoes_adicionais: Optional[str] = Field(None, max_length=2000)
    destinatario: DestinatarioInput
    itens: List[ItemInput] = Field(..., min_length=1)


class NFeItemResponse(BaseModel):
    numero_item: int
    codigo: str
    descricao: str
    ncm: str
    cfop: str
    unidade_comercial: str
    quantidade: float
    valor_unitario: float
    valor_total: float
    csosn: str
    origem: str

    model_config = ConfigDict(from_attributes=True)


class NFeResponse(BaseModel):
    id: int
    numero: int
    serie: int
    modelo: str
    status: str
    ambiente: str
    natureza_operacao: str
    finalidade: str
    chave_acesso: Optional[str]
    protocolo: Optional[str]
    codigo_status_sefaz: Optional[str]
    motivo_rejeicao: Optional[str]
    destinatario_nome: str
    destinatario_documento: str
    valor_produtos: float
    valor_total: float
    data_emissao: Optional[datetime]
    data_autorizacao: Optional[datetime]
    itens: List[NFeItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class NFeListResponse(BaseModel):
    items: List[NFeResponse]
    total: int
    page: int
    per_page: int
