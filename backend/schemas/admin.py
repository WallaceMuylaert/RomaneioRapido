from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class BulkEmailRequest(BaseModel):
    subject: str = Field(..., min_length=3, max_length=120)
    message: str = Field(..., min_length=10, max_length=10000)
    recipient_scope: Literal["all", "active", "inactive"] = "active"
    plan_id: Optional[str] = Field(None, max_length=50)
    exclude_admins: bool = True

    @field_validator("subject")
    @classmethod
    def clean_subject(cls, value: str) -> str:
        cleaned = " ".join(value.strip().splitlines())
        if not cleaned:
            raise ValueError("O assunto é obrigatório.")
        return cleaned

    @field_validator("message")
    @classmethod
    def clean_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("A mensagem é obrigatória.")
        return cleaned

    @field_validator("plan_id")
    @classmethod
    def clean_plan(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "all":
            return None
        return value.strip()


class BulkEmailResponse(BaseModel):
    total_recipients: int
    sent: int
    failed: int
    failed_emails: List[str]
    smtp_configured: bool
