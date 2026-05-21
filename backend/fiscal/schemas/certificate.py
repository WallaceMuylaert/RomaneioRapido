"""DTOs do certificado A1 (apenas metadados — o PFX nunca trafega na resposta)."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CertificateResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    subject_cn: Optional[str] = None
    issuer_cn: Optional[str] = None
    serial_number: Optional[str] = None
    not_before: Optional[datetime] = None
    not_after: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CertificateStatusResponse(BaseModel):
    has_certificate: bool
    metadata: Optional[CertificateResponse] = None
    is_expired: bool = False
