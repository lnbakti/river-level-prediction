from app.models.user import User
from app.core.security import get_current_user, get_current_admin
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.user_service import (
    register_user,
    verify_otp_and_save_user,
    get_users,
    get_user_by_id,
    update_user_data,
    delete_user_data,
)

router = APIRouter()

# Schema khusus untuk menerima body request OTP
class OTPVerificationRequest(BaseModel):
    username: str = Field(..., description="Username yang digunakan saat mendaftar")
    otp: str = Field(..., description="Kode OTP 6-digit yang diterima di WA")

@router.post("/register")
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Endpoint Registrasi Tahap 1.
    Hanya memeriksa duplikasi dan mengirimkan pesan OTP WA via sistem Fonnte (Delayed Persistence di RAM).
    """
    return register_user(db=db, user_data=user_data)

@router.post("/verify-otp", response_model=UserResponse)
def verify_otp(payload: OTPVerificationRequest, db: Session = Depends(get_db)):
    """
    Endpoint Registrasi Tahap 2.
    Jika OTP yang dimasukkan cocok dengan yang ada di RAM, akun langsung didaftarkan permanen di PostgreSQL.
    """
    return verify_otp_and_save_user(db=db, username=payload.username, otp=payload.otp)

class ResendOTPRequest(BaseModel):
    username: str

@router.post("/resend-otp")
def resend_otp_route(payload: ResendOTPRequest):
    from app.services.user_service import resend_otp
    return resend_otp(username=payload.username)

@router.get("/check-username")
def check_username(username: str, db: Session = Depends(get_db)):
    """
    Mengecek apakah username sudah terdaftar di database.
    """
    from app.models.user import User
    exists = db.query(User).filter(User.username == username).first() is not None
    return {"available": not exists}

@router.get("/check-wa")
def check_wa(no_wa: str, db: Session = Depends(get_db)):
    """
    Mengecek apakah no_wa sudah terdaftar di database.
    """
    from app.models.user import User
    exists = db.query(User).filter(User.no_wa == no_wa).first() is not None
    return {"available": not exists}

@router.get("/", response_model=List[UserResponse])
def list_users(limit: int = 50, offset: int = 0, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Mengambil daftar pengguna dari database."""
    return get_users(db=db, limit=limit, offset=offset)

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    user = get_user_by_id(db=db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    return update_user_data(db=db, user_id=user_id, user_update=user_update)

from app.models.user import User
from app.core.security import get_current_user, get_current_admin
from typing import Optional

class ProfileUpdateRequest(BaseModel):
    otp: str
    nama_lengkap: Optional[str] = None
    no_wa: Optional[str] = None
    alamat: Optional[str] = None
    status_notif: Optional[str] = None
    old_password: Optional[str] = None
    new_password: Optional[str] = None

@router.post("/me/request-update-otp")
def request_update_otp(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.user_service import request_profile_update_otp
    return request_profile_update_otp(db=db, user=current_user)

@router.put("/me/update-with-otp")
def update_profile_with_otp(payload: ProfileUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.user_service import update_profile_with_otp
    return update_profile_with_otp(db=db, user=current_user, payload=payload)

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    delete_user_data(db=db, user_id=user_id)
    return {"detail": "Pengguna berhasil dihapus"}





