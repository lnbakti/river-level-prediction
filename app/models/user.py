import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "Admin"
    PENGGUNA = "Pengguna"

class UserStatus(str, enum.Enum):
    AKTIF = "Aktif"
    NONAKTIF = "Nonaktif"

class UserNotifStatus(str, enum.Enum):
    AKTIF = "Aktif"
    NONAKTIF = "Nonaktif"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    nama_lengkap = Column(String(100), nullable=False)
    no_wa = Column(String(20), unique=True, nullable=False, index=True)
    alamat = Column(Text, nullable=True)
    role = Column(Enum(UserRole, name="user_role_enum"), nullable=False, default=UserRole.PENGGUNA)
    status_akun = Column(Enum(UserStatus, name="user_status_enum"), nullable=False, default=UserStatus.AKTIF)
    status_notif = Column(Enum(UserNotifStatus, name="user_notif_enum"), nullable=False, default=UserNotifStatus.AKTIF)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    system_errors = relationship("SystemError", back_populates="user", cascade="all, delete-orphan")
