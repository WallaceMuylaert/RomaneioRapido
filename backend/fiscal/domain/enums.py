"""Enums do domínio fiscal."""
from enum import Enum


class AmbienteSEFAZ(str, Enum):
    HOMOLOGACAO = "homologacao"
    PRODUCAO = "producao"

    @property
    def codigo_tp_amb(self) -> int:
        return 1 if self is AmbienteSEFAZ.PRODUCAO else 2


class RegimeTributario(str, Enum):
    SIMPLES_NACIONAL = "1"
    SIMPLES_NACIONAL_EXCESSO = "2"
    REGIME_NORMAL = "3"
    MEI = "4"


class CSOSN(str, Enum):
    """Códigos de Situação da Operação - Simples Nacional (declarados no escopo da proposta)."""
    TRIBUTADA_COM_PERMISSAO_CREDITO = "101"
    TRIBUTADA_SEM_PERMISSAO_CREDITO = "102"
    ISENCAO_ICMS_FAIXA_RECEITA = "103"
    IMUNE = "300"
    NAO_TRIBUTADA = "400"
    OUTROS = "900"


class NFeStatus(str, Enum):
    """Estados internos do ciclo de vida de uma NF-e."""
    RASCUNHO = "rascunho"
    EM_VALIDACAO = "em_validacao"
    ASSINADA = "assinada"
    ENVIADA = "enviada"
    AUTORIZADA = "autorizada"
    REJEITADA = "rejeitada"
    DENEGADA = "denegada"
    CANCELADA = "cancelada"
    ERRO = "erro"


class ModeloDocumento(str, Enum):
    NFE = "55"
    NFCE = "65"


class TipoOperacao(str, Enum):
    ENTRADA = "0"
    SAIDA = "1"


class FinalidadeEmissao(str, Enum):
    NORMAL = "1"
    COMPLEMENTAR = "2"
    AJUSTE = "3"
    DEVOLUCAO = "4"


class IndicadorPresenca(str, Enum):
    NAO_SE_APLICA = "0"
    PRESENCIAL = "1"
    INTERNET = "2"
    TELEATENDIMENTO = "3"
    NFCE_DOMICILIO = "4"
    PRESENCIAL_FORA = "5"
    OUTROS = "9"
