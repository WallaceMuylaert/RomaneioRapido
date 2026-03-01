from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, List
from datetime import datetime
from backend.models.inventory import MovementType


class InventoryMovementBase(BaseModel):
    product_id: int
    quantity: float
    movement_type: MovementType
    notes: Optional[str] = None
    product_name_snapshot: Optional[str] = None
    product_barcode_snapshot: Optional[str] = None
    unit_price_snapshot: Optional[float] = None
    unit_snapshot: Optional[str] = None
    romaneio_id: Optional[str] = None
    client_id: Optional[int] = None


class InventoryMovementCreate(InventoryMovementBase):
    pass


class ClientInfo(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InventoryMovementResponse(InventoryMovementBase):
    id: int
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    product_name: Optional[str] = None
    client: Optional[ClientInfo] = None

    model_config = ConfigDict(from_attributes=True)


class InventoryMovementPaginatedResponse(BaseModel):
    items: List[InventoryMovementResponse]
    total: int
    page: int
    per_page: int


class StockLevel(BaseModel):
    product_id: int
    product_name: str
    barcode: Optional[str] = None
    stock_quantity: float
    min_stock: float
    unit: str = "UN"
    price: float = 0.0
    is_low_stock: bool

    model_config = ConfigDict(from_attributes=True)
