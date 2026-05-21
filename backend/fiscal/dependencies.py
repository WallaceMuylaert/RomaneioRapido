"""Composition root das dependências fiscais.

Concentra o `wiring` (injeção de dependências) em um único lugar.
Os routers chamam apenas estas funções; trocar implementação concreta
(p. ex., transmitter) exige edição de um único arquivo.
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user_flexible
from backend.models.users import User

from .repositories.certificate_repository import CertificateRepository
from .repositories.fiscal_config_repository import FiscalConfigRepository
from .repositories.nfe_repository import NFeRepository
from .services.certificate_service import CertificateService
from .services.crypto_service import CryptoService
from .services.danfe_renderer import DanfeRenderer
from .services.fiscal_config_service import FiscalConfigService
from .services.nfe_service import NFeService
from .services.nfe_signer_service import get_default_signer
from .services.sefaz_transmitter import get_default_transmitter
from .services.xml_builder_service import get_default_builder


def require_fiscal_admin(current_user: User = Depends(get_current_user_flexible)) -> User:
    """Acesso restrito a administradores (proposta: 'Controle de acesso restrito')."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: módulo fiscal restrito a administradores.",
        )
    return current_user


def get_crypto_service() -> CryptoService:
    return CryptoService()


def get_certificate_service(
    db: Session = Depends(get_db),
    crypto: CryptoService = Depends(get_crypto_service),
) -> CertificateService:
    return CertificateService(repository=CertificateRepository(db), crypto=crypto)


def get_fiscal_config_service(db: Session = Depends(get_db)) -> FiscalConfigService:
    return FiscalConfigService(repository=FiscalConfigRepository(db))


def get_danfe_renderer() -> DanfeRenderer:
    return DanfeRenderer()


def get_nfe_service(
    db: Session = Depends(get_db),
    cert_service: CertificateService = Depends(get_certificate_service),
    cfg_service: FiscalConfigService = Depends(get_fiscal_config_service),
) -> NFeService:
    return NFeService(
        nfe_repository=NFeRepository(db),
        fiscal_config_repository=FiscalConfigRepository(db),
        fiscal_config_service=cfg_service,
        certificate_service=cert_service,
        xml_builder=get_default_builder(),
        xml_signer=get_default_signer(),
        transmitter=get_default_transmitter(),
    )
