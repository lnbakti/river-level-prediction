from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth_service import get_password_hash
from app.services.whatsapp_service import send_whatsapp_message
from typing import Optional
import random
import time

# ==============================================================================
# IN-MEMORY CACHE UNTUK OTP (Delayed Persistence)
# Aturan: Pendaftar harus validasi OTP di RAM sebelum masuk permanen ke PostgreSQL
# Struktur: { "username": {"data": UserCreate, "otp": "123456", "expires_at": float} }
# ==============================================================================
otp_cache = {}
OTP_EXPIRATION_SECONDS = 120  # Waktu kadaluarsa OTP 90 detik sesuai spesifikasi terbaru

from sqlalchemy import or_

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Mengambil user berdasarkan username."""
    return db.query(User).filter(User.username == username).first()

def get_user_by_identifier(db: Session, identifier: str) -> Optional[User]:
    """Mengambil user berdasarkan username atau no_wa."""
    wa_variants = [identifier]
    
    # Ambil murni angkanya saja untuk menghindari isu decoding URL (misal '+' jadi spasi)
    clean_id = ''.join(filter(str.isdigit, identifier))
    
    if clean_id:
        if clean_id.startswith("0"):
            wa_variants.extend(["62" + clean_id[1:], clean_id[1:], "+62" + clean_id[1:]])
        elif clean_id.startswith("62"):
            wa_variants.extend(["0" + clean_id[2:], clean_id[2:], "+62" + clean_id[2:]])
        elif clean_id.startswith("8"):
            wa_variants.extend(["0" + clean_id, "62" + clean_id, "+62" + clean_id])
        
    return db.query(User).filter(
        or_(User.username == identifier, User.no_wa.in_(wa_variants))
    ).first()

def get_users(db: Session, limit: int = 50, offset: int = 0):
    """Mengambil daftar pengguna untuk dashboard manajemen."""
    return db.query(User).order_by(User.created_at.desc()).limit(limit).offset(offset).all()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def update_user_data(db: Session, user_id: int, user_update: UserUpdate) -> User:
    user = get_user_by_id(db=db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengguna tidak ditemukan")

    if user_update.username and user_update.username != user.username:
        existing = db.query(User).filter(User.username == user_update.username).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username sudah digunakan")

    if user_update.no_wa and user_update.no_wa != user.no_wa:
        existing = db.query(User).filter(User.no_wa == user_update.no_wa).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nomor WhatsApp sudah digunakan")

    if user_update.password:
        user.password_hash = get_password_hash(user_update.password)

    for field, value in user_update.model_dump(exclude_none=True).items():
        if field == "password":
            continue
        setattr(user, field, value)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def delete_user_data(db: Session, user_id: int):
    user = get_user_by_id(db=db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengguna tidak ditemukan")
    db.delete(user)
    db.commit()


def cleanup_otp_cache():
    """Helper untuk membersihkan memory RAM dari OTP yang sudah kedaluwarsa."""
    current_time = time.time()
    expired_keys = [k for k, v in otp_cache.items() if v["expires_at"] < current_time]
    for k in expired_keys:
        del otp_cache[k]

def register_user(db: Session, user_data: UserCreate) -> dict:
    """
    TAHAP 1: Menerima data pendaftar, membuat OTP, menyimpannya di RAM, 
    dan mengirimkannya via WA. TIDAK DISIMPAN ke PostgreSQL.
    """
    cleanup_otp_cache()

    # Cek duplikasi di database permanen
    if get_user_by_username(db, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username sudah terdaftar, silakan gunakan username lain."
        )
    
    existing_wa = db.query(User).filter(User.no_wa == user_data.no_wa).first()
    if existing_wa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nomor WhatsApp sudah terdaftar."
        )

    # Buat 6-digit OTP acak
    otp_code = str(random.randint(100000, 999999))
    
    # Simpan ke in-memory cache (RAM)
    otp_cache[user_data.username] = {
        "data": user_data,
        "otp": otp_code,
        "expires_at": time.time() + OTP_EXPIRATION_SECONDS
    }

    # Kirim WhatsApp via Fonnte
    pesan_wa = f"Halo {user_data.nama_lengkap}!\n\nIni adalah kode OTP Anda untuk pendaftaran Water Level System: *{otp_code}*.\n\nKode ini berlaku selama 5 menit. JANGAN berikan kode ini kepada siapa pun."
    success = send_whatsapp_message(user_data.no_wa, pesan_wa)
    
    if not success:
        # Jika WA gagal dikirim total, hapus cache agar bisa daftar ulang langsung
        del otp_cache[user_data.username]
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengirim kode OTP ke WhatsApp Anda. Silakan coba beberapa saat lagi."
        )

    return {"message": "Kode OTP telah dikirim ke WhatsApp Anda. Silakan verifikasi untuk menyelesaikan pendaftaran."}

def verify_otp_and_save_user(db: Session, username: str, otp: str) -> User:
    """
    TAHAP 2: Mencocokkan OTP dari RAM. Jika cocok, data dipindahkan secara permanen ke PostgreSQL.
    """
    cleanup_otp_cache()

    if username not in otp_cache:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sesi pendaftaran tidak ditemukan atau OTP sudah kedaluwarsa."
        )
    
    cached_data = otp_cache[username]
    
    if cached_data["otp"] != otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP yang dimasukkan salah."
        )
    
    # Ekstrak data dari RAM
    user_data: UserCreate = cached_data["data"]
    
    # Hash password baru di sini sebelum masuk database
    hashed_password = get_password_hash(user_data.password)
    
    # Konversi ke SQLAlchemy Model
    db_user = User(
        username=user_data.username,
        password_hash=hashed_password,
        nama_lengkap=user_data.nama_lengkap,
        no_wa=user_data.no_wa,
        alamat=user_data.alamat,
        role=user_data.role,
        status_akun=user_data.status_akun,
        status_notif=user_data.status_notif
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        # Menghapus data dari RAM setelah berhasil
        del otp_cache[username]
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terjadi kesalahan internal saat memindahkan data ke PostgreSQL: {str(e)}"
        )
    
    return db_user

def resend_otp(username: str) -> dict:
    cleanup_otp_cache()
    if username not in otp_cache:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sesi pendaftaran tidak ditemukan atau sudah kedaluwarsa. Silakan daftar ulang."
        )
    
    # Generate new OTP
    otp_code = str(random.randint(100000, 999999))
    user_data = otp_cache[username]["data"]
    
    otp_cache[username]["otp"] = otp_code
    otp_cache[username]["expires_at"] = time.time() + OTP_EXPIRATION_SECONDS
    
    pesan_wa = f"Halo {user_data.nama_lengkap}!\n\nIni adalah KODE BARU OTP Anda untuk pendaftaran Water Level System: *{otp_code}*.\n\nKode ini berlaku selama 120 detik. JANGAN berikan kode ini kepada siapa pun."
    success = send_whatsapp_message(user_data.no_wa, pesan_wa)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengirim kode OTP ke WhatsApp Anda. Silakan coba beberapa saat lagi."
        )

    return {"message": "Kode OTP baru telah dikirim ke WhatsApp Anda."}

# ==============================================================================
# IN-MEMORY CACHE UNTUK RESET PASSWORD
# Struktur: { "no_wa": {"otp": "123456", "expires_at": float} }
# ==============================================================================
reset_otp_cache = {}

def cleanup_reset_otp_cache():
    current_time = time.time()
    expired_keys = [k for k, v in reset_otp_cache.items() if v["expires_at"] < current_time]
    for k in expired_keys:
        del reset_otp_cache[k]

def request_password_reset_otp(db: Session, no_wa: str) -> dict:
    cleanup_reset_otp_cache()
    
    user = get_user_by_identifier(db=db, identifier=no_wa)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nomor WhatsApp tidak terdaftar."
        )

    # Buat 6-digit OTP acak
    otp_code = str(random.randint(100000, 999999))
    
    reset_otp_cache[user.no_wa] = {
        "otp": otp_code,
        "expires_at": time.time() + 300 # 5 Menit agar user sempat membuat password baru
    }

    pesan_wa = f"Halo {user.nama_lengkap}!\n\nIni adalah kode OTP Anda untuk MERESET PASSWORD: *{otp_code}*.\n\nKode ini berlaku selama 120 detik. JANGAN berikan kode ini kepada siapa pun."
    success = send_whatsapp_message(user.no_wa, pesan_wa)
    
    if not success:
        del reset_otp_cache[user.no_wa]
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengirim kode OTP ke WhatsApp Anda. Silakan coba beberapa saat lagi."
        )

    return {"message": "Kode OTP telah dikirim ke WhatsApp Anda."}

def verify_password_reset_otp(db: Session, no_wa: str, otp: str) -> dict:
    cleanup_reset_otp_cache()
    
    user = get_user_by_identifier(db=db, identifier=no_wa)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nomor WhatsApp tidak terdaftar."
        )
        
    db_wa = user.no_wa
    
    if db_wa not in reset_otp_cache:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sesi reset password tidak ditemukan atau OTP sudah kedaluwarsa."
        )
        
    cached_data = reset_otp_cache[db_wa]
    
    if cached_data["otp"] != otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP yang dimasukkan salah."
        )
        
    return {"message": "Kode OTP valid."}

def reset_password_with_otp(db: Session, no_wa: str, otp: str, new_password: str) -> dict:
    cleanup_reset_otp_cache()
    
    user = get_user_by_identifier(db=db, identifier=no_wa)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nomor WhatsApp tidak terdaftar."
        )
        
    db_wa = user.no_wa
        
    if db_wa not in reset_otp_cache:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sesi reset password tidak ditemukan atau OTP sudah kedaluwarsa."
        )
        
    cached_data = reset_otp_cache[db_wa]
    
    if cached_data["otp"] != otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP yang dimasukkan salah."
        )
        
    user.password_hash = get_password_hash(new_password)
    db.add(user)
    db.commit()
    
    del reset_otp_cache[db_wa]
    
    return {"message": "Password berhasil diubah. Silakan login dengan password baru."}

# ==============================================================================
# IN-MEMORY CACHE UNTUK UPDATE PROFIL
# ==============================================================================
profile_update_otp_cache = {}

def request_profile_update_otp(db: Session, user) -> dict:
    current_time = time.time()
    expired_keys = [k for k, v in profile_update_otp_cache.items() if v["expires_at"] < current_time]
    for k in expired_keys:
        del profile_update_otp_cache[k]
        
    otp_code = str(random.randint(100000, 999999))
    
    profile_update_otp_cache[user.username] = {
        "otp": otp_code,
        "expires_at": time.time() + 120
    }

    pesan_wa = f"Halo {user.nama_lengkap}!\n\nIni adalah kode OTP Anda untuk MENGUBAH PROFIL ATAU PENGATURAN: *{otp_code}*.\n\nKode ini berlaku selama 120 detik. JANGAN berikan kode ini kepada siapa pun."
    success = send_whatsapp_message(user.no_wa, pesan_wa)
    
    if not success:
        del profile_update_otp_cache[user.username]
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gagal mengirim kode OTP ke WhatsApp Anda. Silakan coba beberapa saat lagi."
        )

    return {"message": "Kode OTP untuk verifikasi perubahan telah dikirim ke WhatsApp Anda."}

def update_profile_with_otp(db: Session, user, payload) -> dict:
    current_time = time.time()
    expired_keys = [k for k, v in profile_update_otp_cache.items() if v["expires_at"] < current_time]
    for k in expired_keys:
        del profile_update_otp_cache[k]

    if user.username not in profile_update_otp_cache:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sesi verifikasi tidak ditemukan atau OTP sudah kedaluwarsa."
        )
        
    if profile_update_otp_cache[user.username]["otp"] != payload.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kode OTP salah."
        )
        
    if payload.old_password and payload.new_password:
        from app.services.auth_service import verify_password, get_password_hash
        if not verify_password(payload.old_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Password lama tidak sesuai.")
        user.password_hash = get_password_hash(payload.new_password)
        
    if payload.nama_lengkap is not None: user.nama_lengkap = payload.nama_lengkap
    if payload.no_wa is not None: user.no_wa = payload.no_wa
    if payload.alamat is not None: user.alamat = payload.alamat
    if payload.status_notif is not None: user.status_notif = payload.status_notif
    
    db.commit()
    
    del profile_update_otp_cache[user.username]
    
    return {"message": "Perubahan berhasil disimpan!"}
