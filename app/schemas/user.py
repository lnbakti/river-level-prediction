from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from datetime import datetime

# Import Enum dari model SQLAlchemy untuk memastikan sinkronisasi tipe data
from app.models.user import UserRole, UserStatus, UserNotifStatus

class UserBase(BaseModel):
    username: str = Field(..., max_length=50, description="Username unik")
    nama_lengkap: str = Field(..., max_length=100, description="Nama lengkap pengguna")
    no_wa: str = Field(..., max_length=20, description="Nomor WhatsApp (hanya angka)")
    alamat: Optional[str] = None
    role: UserRole = UserRole.PENGGUNA
    status_akun: UserStatus = UserStatus.AKTIF
    status_notif: UserNotifStatus = UserNotifStatus.AKTIF

    @field_validator('no_wa')
    @classmethod
    def validate_no_wa(cls, v: str) -> str:
        check_val = v[1:] if v.startswith('+') else v
        if not check_val.isdigit():
            raise ValueError('Nomor WhatsApp hanya boleh berisi angka (dengan awalan + opsional).')
        return v

class UserCreate(UserBase):
    """
    Schema untuk registrasi/pembuatan user baru.
    Menerima password dalam bentuk plain-text (akan di-hash di layer service).
    """
    password: str = Field(..., min_length=8, description="Password minimal 8 karakter")

class UserUpdate(BaseModel):
    """
    Schema untuk update data user. Semua field bersifat opsional.
    """
    username: Optional[str] = Field(None, max_length=50)
    nama_lengkap: Optional[str] = Field(None, max_length=100)
    no_wa: Optional[str] = Field(None, max_length=20)
    alamat: Optional[str] = None
    role: Optional[UserRole] = None
    status_akun: Optional[UserStatus] = None
    status_notif: Optional[UserNotifStatus] = None
    password: Optional[str] = Field(None, min_length=8)

    @field_validator('no_wa')
    @classmethod
    def validate_no_wa(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            check_val = v[1:] if v.startswith('+') else v
            if not check_val.isdigit():
                raise ValueError('Nomor WhatsApp hanya boleh berisi angka (dengan awalan + opsional).')
        return v

class UserResponse(UserBase):
    """
    Schema untuk mengembalikan data user (response).
    Password tidak disertakan di sini.
    """
    id: int
    created_at: datetime
    updated_at: datetime

    # from_attributes=True menggantikan orm_mode=True di Pydantic V2
    # use_enum_values=True memastikan Enum dikonversi ke string murni di JSON output
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)
