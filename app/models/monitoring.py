from sqlalchemy import Column, BigInteger, Double, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class Monitoring(Base):
    __tablename__ = "monitoring"

    id = Column(BigInteger, primary_key=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, unique=True, index=True)
    tinggi_air = Column(Double, nullable=False)
    hujan = Column(Double, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    prediction_details = relationship("PredictionDetail", back_populates="monitoring", cascade="all, delete-orphan")
