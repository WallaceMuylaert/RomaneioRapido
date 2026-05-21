"""Hierarquia de exceções do domínio fiscal.

Mapeadas para HTTP nos routers (sem que os services conheçam HTTP).
"""


class FiscalError(Exception):
    """Erro genérico do domínio fiscal."""


class FiscalValidationError(FiscalError):
    """Falha em validação de dado fiscal (CNPJ, NCM, CFOP, etc.)."""


class FiscalConfigError(FiscalError):
    """Configuração fiscal do emitente ausente ou incompleta."""


class CertificateError(FiscalError):
    """Erro relacionado ao certificado A1."""


class CertificateNotFoundError(CertificateError):
    """Nenhum certificado A1 cadastrado para o emitente."""


class CertificateInvalidError(CertificateError):
    """Arquivo PFX inválido ou senha incorreta."""


class CertificateExpiredError(CertificateError):
    """Certificado fora do prazo de validade."""


class SefazError(FiscalError):
    """Erro retornado pela SEFAZ ou na comunicação com ela."""

    def __init__(self, message: str, codigo: str | None = None, motivo: str | None = None) -> None:
        super().__init__(message)
        self.codigo = codigo
        self.motivo = motivo


class SefazRejectedError(SefazError):
    """NF-e rejeitada pela SEFAZ (status diferente de 100)."""


class NFeNotFoundError(FiscalError):
    """NF-e não encontrada para o usuário corrente."""


class NFeStateError(FiscalError):
    """Operação não permitida no estado atual da NF-e."""
