import enum
from sqlalchemy import Column, BigInteger, Integer, Boolean, Text, DateTime, ForeignKey, Enum, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class DeviceStatus(str, enum.Enum):
    ONLINE = "Online"
    WARNING = "Warning"
    OFFLINE = "Offline"

ErrorStatus = DeviceStatus

class SystemError(Base):
    __tablename__ = "system_error"

    id = Column(BigInteger, primary_key=True)
    id_users = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    status_alat = Column(Enum(DeviceStatus, name="system_error_status_enum"), nullable=False)
    pesan = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="system_errors")

    __table_args__ = (
        Index("idx_system_error_user", "id_users", "is_read"),
    )
