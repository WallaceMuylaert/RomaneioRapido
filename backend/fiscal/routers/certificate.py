"""Endpoints do certificado A1 (upload/status/remoção).

Limite de 1 MB para o arquivo PFX — alinhado ao tamanho típico do A1
(geralmente <50 KB) e abaixo do MAX_BODY_SIZE global.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from backend.models.users import User

from ..dependencies import get_certificate_service, require_fiscal_admin
from ..domain.exceptions import CertificateNotFoundError
from ..schemas.certificate import CertificateResponse, CertificateStatusResponse
from ..services.certificate_service import CertificateService
from ._error_mapping import handle_fiscal_errors

router = APIRouter(prefix="/fiscal/certificate", tags=["fiscal"])

_MAX_PFX_BYTES = 1 * 1024 * 1024  # 1 MB


@router.get("/", response_model=CertificateStatusResponse)
def get_status(
    current_user: User = Depends(require_fiscal_admin),
    service: CertificateService = Depends(get_certificate_service),
):
    try:
        cert = service.get_metadata(current_user.id)
    except CertificateNotFoundError:
        return CertificateStatusResponse(has_certificate=False)

    is_expired = bool(cert.not_after and cert.not_after < datetime.now(timezone.utc))
    return CertificateStatusResponse(
        has_certificate=True,
        metadata=CertificateResponse.model_validate(cert),
        is_expired=is_expired,
    )


@router.post("/", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED)
async def upload_certificate(
    password: str = Form(..., min_length=1, max_length=200),
    file: UploadFile = File(...),
    current_user: User = Depends(require_fiscal_admin),
    service: CertificateService = Depends(get_certificate_service),
):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Arquivo do certificado vazio.")
    if len(contents) > _MAX_PFX_BYTES:
        raise HTTPException(status_code=413, detail="Arquivo do certificado excede 1 MB.")
    if not (file.filename or "").lower().endswith((".pfx", ".p12")):
        raise HTTPException(status_code=400, detail="Envie um arquivo .pfx ou .p12.")

    with handle_fiscal_errors():
        cert = service.upload(
            user_id=current_user.id,
            filename=file.filename or "certificado.pfx",
            pfx_bytes=contents,
            password=password,
        )
    return cert


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def delete_certificate(
    current_user: User = Depends(require_fiscal_admin),
    service: CertificateService = Depends(get_certificate_service),
):
    service.delete(current_user.id)
    return None
