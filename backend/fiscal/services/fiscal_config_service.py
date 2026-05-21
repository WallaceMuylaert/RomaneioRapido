"""Service da configuração fiscal: valida e persiste dados do emitente."""
from __future__ import annotations

from typing import Optional

from backend.fiscal.domain.exceptions import FiscalConfigError, FiscalValidationError
from backend.fiscal.models.fiscal_config import FiscalConfig
from backend.fiscal.repositories.fiscal_config_repository import FiscalConfigRepository
from backend.fiscal.validators import (
    is_valid_cep,
    is_valid_cnpj,
    normalize_uf,
    strip_non_digits,
)


class FiscalConfigService:
    def __init__(self, repository: FiscalConfigRepository) -> None:
        self._repo = repository

    def get(self, user_id: int) -> Optional[FiscalConfig]:
        return self._repo.get_by_user(user_id)

    def require(self, user_id: int) -> FiscalConfig:
        config = self.get(user_id)
        if not config:
            raise FiscalConfigError(
                "Configuração fiscal não encontrada. Cadastre os dados do emitente."
            )
        return config

    def upsert(self, user_id: int, data: dict) -> FiscalConfig:
        cleaned = self._clean_and_validate(data)
        return self._repo.upsert(user_id=user_id, data=cleaned)

    def _clean_and_validate(self, data: dict) -> dict:
        cnpj = strip_non_digits(data.get("cnpj", ""))
        if not is_valid_cnpj(cnpj):
            raise FiscalValidationError("CNPJ do emitente inválido.")

        uf = normalize_uf(data.get("uf", ""))
        if not uf:
            raise FiscalValidationError("UF do emitente inválida.")

        cep = strip_non_digits(data.get("cep", ""))
        if not is_valid_cep(cep):
            raise FiscalValidationError("CEP do emitente inválido.")

        cod_municipio = strip_non_digits(data.get("cod_municipio_ibge", ""))
        if len(cod_municipio) != 7:
            raise FiscalValidationError("Código IBGE do município deve ter 7 dígitos.")

        ie = (data.get("inscricao_estadual") or "").strip()
        if not ie:
            raise FiscalValidationError("Inscrição estadual do emitente é obrigatória.")

        return {
            "cnpj": cnpj,
            "razao_social": data["razao_social"].strip(),
            "nome_fantasia": (data.get("nome_fantasia") or "").strip() or None,
            "inscricao_estadual": ie,
            "inscricao_municipal": (data.get("inscricao_municipal") or "").strip() or None,
            "cnae_fiscal": strip_non_digits(data.get("cnae_fiscal", "")) or None,
            "regime_tributario": data.get("regime_tributario", "1"),
            "logradouro": data["logradouro"].strip(),
            "numero": str(data["numero"]).strip(),
            "complemento": (data.get("complemento") or "").strip() or None,
            "bairro": data["bairro"].strip(),
            "municipio": data["municipio"].strip(),
            "cod_municipio_ibge": cod_municipio,
            "uf": uf,
            "cep": cep,
            "serie_padrao": int(data.get("serie_padrao") or 1),
            "proximo_numero": int(data.get("proximo_numero") or 1),
            "ambiente": data.get("ambiente", "homologacao"),
        }
