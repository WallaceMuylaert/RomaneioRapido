"""Endpoints da NF-e: rascunho, emissão, listagem, DANFE (prévia)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query

from backend.models.users import User

from ..dependencies import (
    get_danfe_renderer,
    get_fiscal_config_service,
    get_nfe_service,
    require_fiscal_admin,
)
from ..schemas.nfe import NFeDraftCreate, NFeListResponse, NFeResponse
from ..services.danfe_renderer import DanfeRenderer
from ..services.fiscal_config_service import FiscalConfigService
from ..services.nfe_service import NFeService
from ._error_mapping import handle_fiscal_errors

router = APIRouter(prefix="/fiscal/nfe", tags=["fiscal"])


@router.post("/", response_model=NFeResponse)
def create_draft(
    payload: NFeDraftCreate,
    current_user: User = Depends(require_fiscal_admin),
    service: NFeService = Depends(get_nfe_service),
):
    with handle_fiscal_errors():
        return service.create_draft(current_user.id, payload.model_dump())


@router.post("/{nfe_id}/issue", response_model=NFeResponse)
def issue_nfe(
    nfe_id: int,
    current_user: User = Depends(require_fiscal_admin),
    service: NFeService = Depends(get_nfe_service),
):
    with handle_fiscal_errors():
        return service.issue(current_user.id, nfe_id)


@router.get("/", response_model=NFeListResponse)
def list_nfes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    current_user: User = Depends(require_fiscal_admin),
    service: NFeService = Depends(get_nfe_service),
):
    return service.list(current_user.id, page=page, per_page=per_page, status=status)


@router.get("/{nfe_id}", response_model=NFeResponse)
def get_nfe(
    nfe_id: int,
    current_user: User = Depends(require_fiscal_admin),
    service: NFeService = Depends(get_nfe_service),
):
    with handle_fiscal_errors():
        return service.get(current_user.id, nfe_id)


@router.get("/{nfe_id}/danfe")
def get_danfe_preview(
    nfe_id: int,
    current_user: User = Depends(require_fiscal_admin),
    service: NFeService = Depends(get_nfe_service),
    cfg_service: FiscalConfigService = Depends(get_fiscal_config_service),
    renderer: DanfeRenderer = Depends(get_danfe_renderer),
):
    with handle_fiscal_errors():
        nfe = service.get(current_user.id, nfe_id)
        config = cfg_service.require(current_user.id)
        return renderer.render(nfe, config)
