"""Endpoints da configuração fiscal do emitente."""
from fastapi import APIRouter, Depends

from backend.models.users import User

from ..dependencies import get_fiscal_config_service, require_fiscal_admin
from ..schemas.fiscal_config import FiscalConfigCreate, FiscalConfigResponse
from ..services.fiscal_config_service import FiscalConfigService
from ._error_mapping import handle_fiscal_errors

router = APIRouter(prefix="/fiscal/config", tags=["fiscal"])


@router.get("/", response_model=FiscalConfigResponse | None)
def get_config(
    current_user: User = Depends(require_fiscal_admin),
    service: FiscalConfigService = Depends(get_fiscal_config_service),
):
    return service.get(current_user.id)


@router.put("/", response_model=FiscalConfigResponse)
def upsert_config(
    payload: FiscalConfigCreate,
    current_user: User = Depends(require_fiscal_admin),
    service: FiscalConfigService = Depends(get_fiscal_config_service),
):
    with handle_fiscal_errors():
        return service.upsert(current_user.id, payload.model_dump())
