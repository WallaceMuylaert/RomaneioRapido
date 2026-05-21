"""Validadores e formatadores fiscais.

Cada submódulo cobre uma única classe de validação (SRP) e é puro
(sem I/O, sem dependências de framework) — favorece reuso e testes.
"""
from .documents import is_valid_cnpj, is_valid_cpf, strip_non_digits
from .address import is_valid_cep, normalize_uf
from .fiscal_codes import is_valid_ncm, is_valid_cfop, is_valid_csosn
from .formatters import (
    format_cnpj,
    format_cpf,
    format_cep,
    format_phone,
    format_currency_brl,
)

__all__ = [
    "is_valid_cnpj",
    "is_valid_cpf",
    "strip_non_digits",
    "is_valid_cep",
    "normalize_uf",
    "is_valid_ncm",
    "is_valid_cfop",
    "is_valid_csosn",
    "format_cnpj",
    "format_cpf",
    "format_cep",
    "format_phone",
    "format_currency_brl",
]
