from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, List
from datetime import datetime


def _require_non_blank(value: Optional[str], field_label: str) -> Optional[str]:
    if value is None:
        return None
    stripped = value.strip()
    if not stripped:
        raise ValueError(f"{field_label} não pode ser vazio.")
    return stripped


class ProductGroupBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator("code")
    @classmethod
    def _validate_code(cls, v: str) -> str:
        return _require_non_blank(v, "Código") or ""

    @field_validator("name")
    @classmethod
    def _validate_name(cls, v: str) -> str:
        return _require_non_blank(v, "Nome") or ""


class ProductGroupCreate(ProductGroupBase):
    pass


class ProductGroupUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator("code")
    @classmethod
    def _validate_code(cls, v: Optional[str]) -> Optional[str]:
        return _require_non_blank(v, "Código")

    @field_validator("name")
    @classmethod
    def _validate_name(cls, v: Optional[str]) -> Optional[str]:
        return _require_non_blank(v, "Nome")


class ProductGroupResponse(ProductGroupBase):
    id: int
    products_count: int = 0
    total_stock: float = 0.0
    total_value: float = 0.0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProductGroupVariantStock(BaseModel):
    product_id: int
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    unit: str = "UN"
    stock_quantity: float = 0.0
    min_stock: float = 0.0
    price: float = 0.0
    is_low_stock: bool = False

    model_config = ConfigDict(from_attributes=True)


class ProductGroupStockReport(BaseModel):
    group: ProductGroupResponse
    variants: List[ProductGroupVariantStock]


class GroupedStockReportItem(BaseModel):
    group_id: Optional[int] = None
    group_code: Optional[str] = None
    group_name: str
    products_count: int = 0
    total_stock: float = 0.0
    total_value: float = 0.0


class GroupedStockReportResponse(BaseModel):
    items: List[GroupedStockReportItem]
    total_groups: int
    total_products: int
    total_stock: float
    total_value: float
