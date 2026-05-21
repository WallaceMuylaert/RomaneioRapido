"""Formatadores para apresentação (DANFE, respostas API)."""
from __future__ import annotations

from decimal import Decimal

from .documents import strip_non_digits


def format_cnpj(cnpj: str) -> str:
    d = strip_non_digits(cnpj)
    if len(d) != 14:
        return cnpj
    return f"{d[:2]}.{d[2:5]}.{d[5:8]}/{d[8:12]}-{d[12:]}"


def format_cpf(cpf: str) -> str:
    d = strip_non_digits(cpf)
    if len(d) != 11:
        return cpf
    return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"


def format_cep(cep: str) -> str:
    d = strip_non_digits(cep)
    if len(d) != 8:
        return cep
    return f"{d[:5]}-{d[5:]}"


def format_phone(phone: str) -> str:
    d = strip_non_digits(phone)
    if len(d) == 11:
        return f"({d[:2]}) {d[2:7]}-{d[7:]}"
    if len(d) == 10:
        return f"({d[:2]}) {d[2:6]}-{d[6:]}"
    return phone


def format_currency_brl(value: Decimal | float | int) -> str:
    value = Decimal(str(value)).quantize(Decimal("0.01"))
    inteiro, decimal = f"{value:.2f}".split(".")
    inteiro = ",".join(reversed([inteiro[max(i - 3, 0):i] for i in range(len(inteiro), 0, -3)]))
    inteiro = inteiro.replace(",", ".")
    return f"R$ {inteiro},{decimal}"
