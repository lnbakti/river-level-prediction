from sqlalchemy import Column, BigInteger, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.database import Base

class PredictionDetail(Base):
    __tablename__ = "detail_prediksi"

    id = Column(BigInteger, primary_key=True)
    id_monitoring = Column(BigInteger, ForeignKey("monitoring.id", ondelete="CASCADE"), nullable=False)
    id_prediksi = Column(BigInteger, ForeignKey("prediksi.id", ondelete="CASCADE"), nullable=False)

    monitoring = relationship("Monitoring", back_populates="prediction_details")
    prediction = relationship("Prediction", back_populates="prediction_details")

    __table_args__ = (
        Index("idx_detail_prediksi_fk", "id_prediksi", "id_monitoring"),
    )
