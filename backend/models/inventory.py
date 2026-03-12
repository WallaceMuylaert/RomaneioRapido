from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.core.database import Base
import enum


class MovementType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"
    ADJUSTMENT = "ADJUSTMENT"


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    movement_type = Column(Enum(MovementType, name="movementtype", create_type=False), nullable=False)
    notes = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product_name_snapshot = Column(String, nullable=True)
    product_barcode_snapshot = Column(String, nullable=True)
    unit_price_snapshot = Column(Float, nullable=True)
    unit_snapshot = Column(String, nullable=True)
    product_color_snapshot = Column(String, nullable=True)
    product_size_snapshot = Column(String, nullable=True)
    romaneio_id = Column(String, nullable=True, index=True)

    product = relationship("Product", back_populates="movements")
    client = relationship("Client")

    @property
    def product_name(self):
        if self.product_name_snapshot and self.product_name_snapshot.strip():
            return self.product_name_snapshot
        return self.product.name if self.product else "Produto Excluído"

    @property
    def product_image(self):
        return self.product.image_base64 if self.product else None
