from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime

class PendingItem(BaseModel):
    product_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=250)
    barcode: Optional[str] = None
    quantity: float = Field(..., gt=0, le=999_999_999)
    unit: str = Field(..., min_length=1, max_length=20)
    price: float = Field(..., ge=0)
    image: Optional[str] = None
    color: Optional[str] = Field(None, max_length=50)
    size: Optional[str] = Field(None, max_length=50)

class PendingRomaneioBase(BaseModel):
    client_id: Optional[int] = Field(None, gt=0)
    customer_name: Optional[str] = Field(None, max_length=150)
    customer_phone: Optional[str] = Field(None, max_length=30)
    items: List[PendingItem] = Field(..., min_length=1, max_length=500)
    empenhar_estoque: Optional[bool] = True
    discount_percentage: Optional[float] = Field(0.0, ge=0, le=100)

class PendingRomaneioCreate(PendingRomaneioBase):
    pass

class PendingRomaneioUpdate(PendingRomaneioBase):
    pass

class PendingRomaneio(PendingRomaneioBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
