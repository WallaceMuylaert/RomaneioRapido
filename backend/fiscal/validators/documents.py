"""Validação de CPF e CNPJ — algoritmo oficial dos dígitos verificadores.

Funções puras: recebem texto, devolvem booleano.
"""
from __future__ import annotations

import re

_DIGITS_RE = re.compile(r"\D+")


def strip_non_digits(value: str) -> str:
    """Remove qualquer caractere não numérico."""
    if not value:
        return ""
    return _DIGITS_RE.sub("", value)


def _calc_dv(digits: str, weights: list[int]) -> int:
    total = sum(int(d) * w for d, w in zip(digits, weights))
    rest = total % 11
    return 0 if rest < 2 else 11 - rest


def is_valid_cpf(cpf: str) -> bool:
    cpf = strip_non_digits(cpf)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    dv1 = _calc_dv(cpf[:9], list(range(10, 1, -1)))
    if dv1 != int(cpf[9]):
        return False
    dv2 = _calc_dv(cpf[:10], list(range(11, 1, -1)))
    return dv2 == int(cpf[10])


def is_valid_cnpj(cnpj: str) -> bool:
    cnpj = strip_non_digits(cnpj)
    if len(cnpj) != 14 or cnpj == cnpj[0] * 14:
        return False
    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights2 = [6] + weights1
    dv1 = _calc_dv(cnpj[:12], weights1)
    if dv1 != int(cnpj[12]):
        return False
    dv2 = _calc_dv(cnpj[:13], weights2)
    return dv2 == int(cnpj[13])
