from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Any
from datetime import datetime
from backend.core.quantity_limits import MAX_QUANTITY

# Tamanho máximo de imagem base64 ≈ 3 MB em base64
_MAX_IMAGE_BASE64 = 4_000_000


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=250)
    sku: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    price: float = Field(0.0, ge=0)
    cost_price: Optional[float] = Field(0.0, ge=0)
    stock_quantity: float = Field(0.0, ge=0, le=MAX_QUANTITY)
    min_stock: float = Field(0.0, ge=0, le=MAX_QUANTITY)
    unit: str = Field("UN", max_length=20)
    category_id: Optional[int] = None
    image_base64: Optional[str] = Field(None, max_length=_MAX_IMAGE_BASE64)
    is_active: bool = True
    color: Optional[str] = None
    size: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=250)
    sku: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    price: Optional[float] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, ge=0)
    stock_quantity: Optional[float] = Field(None, ge=0, le=MAX_QUANTITY)
    min_stock: Optional[float] = Field(None, ge=0, le=MAX_QUANTITY)
    unit: Optional[str] = Field(None, max_length=20)
    category_id: Optional[int] = None
    image_base64: Optional[str] = Field(None, max_length=_MAX_IMAGE_BASE64)
    is_active: Optional[bool] = None
    color: Optional[str] = None
    size: Optional[str] = None


class ProductResponse(ProductBase):
    id: int
    stock_quantity: float = Field(0.0)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProductSlimResponse(BaseModel):
    """Versão otimizada do produto sem imagem para listagens massivas."""
    id: int
    user_id: Optional[int] = None
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    price: float
    cost_price: Optional[float] = None
    stock_quantity: float
    min_stock: float
    unit: str
    category_id: Optional[int] = None
    is_active: bool
    color: Optional[str] = None
    size: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProductPaginatedResponse(BaseModel):
    """Retorno padronizado para listagens paginadas de produtos."""
    items: List[Any] # Pode conter ProductResponse ou ProductSlimResponse
    total: int
    page: int
    per_page: int
    pages: int

    model_config = ConfigDict(from_attributes=True)
