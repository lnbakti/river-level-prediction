import enum
from sqlalchemy import Column, BigInteger, Integer, Text, DateTime, ForeignKey, Index, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class NotificationStatus(str, enum.Enum):
    TERKIRIM = "Terkirim"
    GAGAL = "Gagal"

class Notification(Base):
    __tablename__ = "notifikasi"

    id = Column(BigInteger, primary_key=True)
    id_users = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    id_prediksi = Column(BigInteger, ForeignKey("prediksi.id", ondelete="SET NULL"), nullable=True)
    
    pesan = Column(Text, nullable=False)
    status = Column(Enum(NotificationStatus, name="notifikasi_status_enum"), nullable=False, default=NotificationStatus.TERKIRIM)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="notifications")
    prediction = relationship("Prediction", back_populates="notifications")

    @property
    def username(self) -> str:
        return self.user.username if self.user else None

    @property
    def nama_lengkap(self) -> str:
        return self.user.nama_lengkap if self.user else None

    __table_args__ = (
        Index("idx_notifikasi_user", "id_users", "created_at"),
    )
