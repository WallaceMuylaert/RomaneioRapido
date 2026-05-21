"""Validação de campos de endereço relevantes para a NF-e."""
from __future__ import annotations

from .documents import strip_non_digits

_UFS = {
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO",
}


def is_valid_cep(cep: str) -> bool:
    return len(strip_non_digits(cep)) == 8


def normalize_uf(uf: str) -> str | None:
    if not uf:
        return None
    uf = uf.strip().upper()
    return uf if uf in _UFS else None
