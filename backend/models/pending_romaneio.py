from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.core.database import Base


class PendingRomaneio(Base):
    __tablename__ = "pending_romaneios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_name = Column(String, nullable=True) # Para clientes avulsos
    customer_phone = Column(String, nullable=True)
    
    # Store the cart items as a JSON list
    items = Column(JSON, nullable=False, default=list)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    client = relationship("Client")
