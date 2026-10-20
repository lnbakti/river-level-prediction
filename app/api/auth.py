from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.services.auth_service import verify_password, create_access_token
from app.services.user_service import get_user_by_identifier, get_user_by_id
from app.core.security import get_current_user

router = APIRouter()

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Endpoint login OAuth2. Menghasilkan token JWT jika username/no_wa dan password valid.
    """
    # Minta data user ke layer service berdasarkan username atau no_wa
    user = get_user_by_identifier(db=db, identifier=form_data.username)
    
    # Verifikasi kredensial
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Buat Token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Mengembalikan data user dari token JWT yang sedang aktif."""
    return current_user

from pydantic import BaseModel
class ForgotPasswordRequest(BaseModel):
    no_wa: str

class ForgotPasswordResetRequest(BaseModel):
    no_wa: str
    otp: str
    new_password: str

@router.post("/forgot-password/request-otp")
def forgot_password_request_otp(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    from app.services.user_service import request_password_reset_otp
    return request_password_reset_otp(db=db, no_wa=payload.no_wa)

class ForgotPasswordVerifyOTPRequest(BaseModel):
    no_wa: str
    otp: str

@router.post("/forgot-password/verify-otp")
def forgot_password_verify_otp(payload: ForgotPasswordVerifyOTPRequest, db: Session = Depends(get_db)):
    from app.services.user_service import verify_password_reset_otp
    return verify_password_reset_otp(db=db, no_wa=payload.no_wa, otp=payload.otp)

@router.post("/forgot-password/reset")
def forgot_password_reset(payload: ForgotPasswordResetRequest, db: Session = Depends(get_db)):
    from app.services.user_service import reset_password_with_otp
    return reset_password_with_otp(db=db, no_wa=payload.no_wa, otp=payload.otp, new_password=payload.new_password)
