from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class PendingItem(BaseModel):
    product_id: int
    name: str
    barcode: Optional[str] = None
    quantity: float
    unit: str
    price: float
    image: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None

class PendingRomaneioBase(BaseModel):
    client_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    items: List[PendingItem]
    empenhar_estoque: bool = False

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
