from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Enum, DateTime, JSON
from sqlalchemy.orm import relationship
from app.database import Base
import enum
import datetime

class InvoiceStatus(str, enum.Enum):
    READY = "READY"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    REJECTED = "REJECTED"

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True) # To isolate user data
    file_hash = Column(String, unique=True, index=True) # To prevent duplicates
    file_path = Column(String, nullable=True)
    vendor_name = Column(String, nullable=False)
    gst_number = Column(String, nullable=True)
    
    # Using Float for simplicity in the DB, but we handle Decimal in Python rules
    subtotal = Column(Float, nullable=False)
    gst_amount = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.NEEDS_REVIEW)
    reasons = Column(JSON, default=list) # Store as a JSON array of strings
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    line_items = relationship("LineItem", back_populates="invoice", cascade="all, delete-orphan")

class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    description = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)

    invoice = relationship("Invoice", back_populates="line_items")