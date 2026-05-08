from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional
from datetime import datetime

class ClientBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    document: Optional[str] = Field(None, max_length=30)
    email: Optional[EmailStr] = None
    address: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=1000)

class ClientCreate(ClientBase):
    pass

class ClientUpdate(ClientBase):
    name: Optional[str] = Field(None, min_length=2, max_length=150)

class ClientResponse(ClientBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
