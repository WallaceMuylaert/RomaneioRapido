from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, Any, List
from datetime import datetime
from backend.models.inventory import MovementType


class InventoryMovementBase(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: float = Field(..., gt=0, le=999_999_999)
    movement_type: MovementType
    notes: Optional[str] = Field(None, max_length=1000)
    product_name_snapshot: Optional[str] = Field(None, max_length=250)
    product_barcode_snapshot: Optional[str] = Field(None, max_length=100)
    unit_price_snapshot: Optional[float] = Field(None, ge=0)
    unit_snapshot: Optional[str] = Field(None, max_length=20)
    product_color_snapshot: Optional[str] = Field(None, max_length=50)
    product_size_snapshot: Optional[str] = Field(None, max_length=50)
    discount_snapshot: Optional[float] = Field(None, ge=0)
    romaneio_id: Optional[str] = Field(None, max_length=100)
    client_id: Optional[int] = None
    pending_romaneio_id: Optional[int] = None


class InventoryMovementCreate(InventoryMovementBase):
    pass


class ClientInfo(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InventoryMovementResponse(InventoryMovementBase):
    id: int
    is_cancelled: bool = False
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    product_name: Optional[str] = None
    product_image: Optional[str] = None
    client: Optional[ClientInfo] = None
    product_price: Optional[float] = None

    @field_validator('is_cancelled', mode='before')
    @classmethod
    def validate_is_cancelled(cls, v):
        if v is None:
            return False
        return v

    @property
    def product_image(self) -> Optional[str]:
        return self.product.image_base64 if self.product else None

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
    image_base64: Optional[str] = None
    is_low_stock: bool
    color: Optional[str] = None
    size: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
