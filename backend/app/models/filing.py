from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Filing(Base):
    __tablename__ = "filings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    filing_type = Column(String, nullable=False)
    filing_date = Column(Date, nullable=False)
    source_url = Column(String, nullable=False)

    company = relationship("Company", back_populates="filings")
    chunks = relationship("Chunk", back_populates="filing")
