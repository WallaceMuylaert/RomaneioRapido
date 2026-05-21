"""Value objects do domínio fiscal: estruturas imutáveis usadas pelos services.

Separados das entidades persistentes (SQLAlchemy) para que regras de negócio
não dependam de detalhes de infraestrutura (DIP).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional

from .enums import (
    AmbienteSEFAZ,
    CSOSN,
    FinalidadeEmissao,
    IndicadorPresenca,
    ModeloDocumento,
    RegimeTributario,
    TipoOperacao,
)


@dataclass(frozen=True)
class Endereco:
    logradouro: str
    numero: str
    bairro: str
    municipio: str
    cod_municipio_ibge: str
    uf: str
    cep: str
    complemento: Optional[str] = None
    pais: str = "Brasil"
    cod_pais: str = "1058"


@dataclass(frozen=True)
class Emitente:
    cnpj: str
    razao_social: str
    nome_fantasia: Optional[str]
    inscricao_estadual: str
    regime_tributario: RegimeTributario
    endereco: Endereco
    inscricao_municipal: Optional[str] = None
    cnae_fiscal: Optional[str] = None


@dataclass(frozen=True)
class Destinatario:
    nome: str
    documento: str  # CNPJ ou CPF (apenas dígitos)
    endereco: Optional[Endereco]
    inscricao_estadual: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None

    @property
    def is_pessoa_juridica(self) -> bool:
        return len(self.documento) == 14


@dataclass(frozen=True)
class ItemFiscal:
    numero_item: int
    codigo: str
    descricao: str
    ncm: str
    cfop: str
    unidade_comercial: str
    quantidade: Decimal
    valor_unitario: Decimal
    csosn: CSOSN
    origem: str = "0"  # 0 = nacional
    ean: Optional[str] = None

    @property
    def valor_total(self) -> Decimal:
        return (self.quantidade * self.valor_unitario).quantize(Decimal("0.01"))


@dataclass(frozen=True)
class IdentificacaoNFe:
    numero: int
    serie: int
    data_emissao: datetime
    modelo: ModeloDocumento = ModeloDocumento.NFE
    tipo_operacao: TipoOperacao = TipoOperacao.SAIDA
    finalidade: FinalidadeEmissao = FinalidadeEmissao.NORMAL
    indicador_presenca: IndicadorPresenca = IndicadorPresenca.PRESENCIAL
    natureza_operacao: str = "VENDA DE MERCADORIA"
    ambiente: AmbienteSEFAZ = AmbienteSEFAZ.HOMOLOGACAO


@dataclass(frozen=True)
class DadosNFe:
    """Agregado raiz para construção do XML da NF-e."""
    identificacao: IdentificacaoNFe
    emitente: Emitente
    destinatario: Destinatario
    itens: tuple[ItemFiscal, ...] = field(default_factory=tuple)
    informacoes_adicionais: Optional[str] = None

    @property
    def valor_total_produtos(self) -> Decimal:
        return sum((item.valor_total for item in self.itens), Decimal("0.00"))


@dataclass(frozen=True)
class ResultadoTransmissao:
    """Resposta padronizada do transmissor SEFAZ (independente da lib usada)."""
    sucesso: bool
    status_codigo: str
    status_motivo: str
    protocolo: Optional[str] = None
    chave_acesso: Optional[str] = None
    xml_autorizado: Optional[str] = None
    data_autorizacao: Optional[datetime] = None
