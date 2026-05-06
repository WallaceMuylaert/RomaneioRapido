from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime
from backend.core.quantity_limits import MAX_QUANTITY

class PendingItem(BaseModel):
    product_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=250)
    barcode: Optional[str] = None
    quantity: float = Field(..., gt=0, le=MAX_QUANTITY)
    unit: str = Field(..., min_length=1, max_length=20)
    price: float = Field(..., ge=0)
    image: Optional[str] = None
    color: Optional[str] = Field(None, max_length=50)
    size: Optional[str] = Field(None, max_length=50)

class PendingRomaneioBase(BaseModel):
    client_id: Optional[int] = Field(None, gt=0)
    customer_name: Optional[str] = Field(None, max_length=150)
    customer_phone: Optional[str] = Field(None, max_length=30)
    empenhar_estoque: Optional[bool] = True
    discount_percentage: Optional[float] = Field(0.0, ge=0, le=100)

class PendingRomaneioCreate(PendingRomaneioBase):
    items: List[PendingItem] = Field(..., min_length=1, max_length=1000)

class PendingRomaneioUpdate(PendingRomaneioBase):
    items: List[PendingItem] = Field(..., min_length=1, max_length=1000) # TODO: Ficar em alerta com esse numero muito grande pois pode pesar no banco de dados

class PendingRomaneio(PendingRomaneioBase):
    id: int
    user_id: int
    items: List[PendingItem]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
