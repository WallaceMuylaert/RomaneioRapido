"""Validação de códigos fiscais: NCM, CFOP e CSOSN.

A consulta da tabela completa (TIPI/SEFAZ) está fora do escopo — aplicamos
validação estrutural (tamanho, dígitos numéricos) e, no caso de CSOSN,
checamos contra o enum oficial dos códigos suportados.
"""
from __future__ import annotations

from ..domain.enums import CSOSN
from .documents import strip_non_digits


def is_valid_ncm(ncm: str) -> bool:
    """NCM tem 8 dígitos (formato Mercosul). Aceita também 2/4/6 (capítulos)."""
    digits = strip_non_digits(ncm or "")
    return len(digits) in {2, 4, 6, 8} and digits.isdigit()


def is_valid_cfop(cfop: str) -> bool:
    """CFOP tem 4 dígitos numéricos. O primeiro indica natureza (1..7)."""
    digits = strip_non_digits(cfop or "")
    if len(digits) != 4 or not digits.isdigit():
        return False
    return digits[0] in {"1", "2", "3", "5", "6", "7"}


def is_valid_csosn(csosn: str) -> bool:
    try:
        CSOSN(csosn)
        return True
    except ValueError:
        return False
