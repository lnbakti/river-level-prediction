import enum
from sqlalchemy import Column, BigInteger, Double, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class PredictionStatus(str, enum.Enum):
    AMAN = "AMAN"
    WASPADA = "WASPADA"
    BAHAYA = "BAHAYA"

class Prediction(Base):
    __tablename__ = "prediksi"

    id = Column(BigInteger, primary_key=True)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    prediksi = Column(Double, nullable=False)
    status = Column(Enum(PredictionStatus, name="prediksi_status"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    prediction_details = relationship("PredictionDetail", back_populates="prediction", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="prediction")
