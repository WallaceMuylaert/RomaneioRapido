from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    sku = Column(String, nullable=True, index=True)
    barcode = Column(String, nullable=True, index=True)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    cost_price = Column(Float, nullable=True, default=0.0)
    stock_quantity = Column(Float, nullable=False, default=0.0)
    min_stock = Column(Float, nullable=False, default=0.0)
    unit = Column(String, nullable=False, default="UN")
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    image_base64 = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("Category", back_populates="products")
    movements = relationship("InventoryMovement", back_populates="product")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint('user_id', 'sku', name='uix_user_product_sku'),
        UniqueConstraint('user_id', 'barcode', name='uix_user_product_barcode'),
    )
