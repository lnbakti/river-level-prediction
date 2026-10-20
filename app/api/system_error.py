from app.core.security import get_current_admin
from app.models.user import User
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.models.system_error import SystemError, ErrorStatus
from app.schemas.system_error import SystemErrorCreate, SystemErrorResponse

router = APIRouter()

@router.post("", response_model=SystemErrorResponse)
@router.post("/", response_model=SystemErrorResponse)
def create_system_error(data: SystemErrorCreate, db: Session = Depends(get_db)):
    """Menerima notifikasi SYSTEM ERROR atau POST dari IoT."""
    
    # IoT mengirim string status, kita parsing ke Enum
    status_enum = ErrorStatus.OFFLINE
    if data.status_alat.lower() == "online":
        status_enum = ErrorStatus.ONLINE
    elif data.status_alat.lower() in ["warning", "error", "sd card error"]:
        status_enum = ErrorStatus.WARNING
        
    # Cari admin utama untuk assigned user (menghindari error ForeignKey jika ID 1 tidak ada)
    admin_user = db.query(User).filter(User.role == "Admin").first()
    admin_id = admin_user.id if admin_user else None

    # Cek pesan terakhir agar tidak spam (jika IoT terus mengirim error yang sama berulang-ulang)
    last_error = db.query(SystemError).order_by(SystemError.id.desc()).first()
    if last_error and last_error.status_alat == status_enum and last_error.pesan == data.pesan:
        return last_error

    db_error = SystemError(
        id_users=admin_id,
        status_alat=status_enum,
        pesan=data.pesan,
        is_read=False
    )
    db.add(db_error)
    db.commit()
    db.refresh(db_error)
    return db_error

@router.get("/", response_model=List[SystemErrorResponse])
def list_system_errors(limit: int = 50, offset: int = 0, unread_only: bool = False, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Mengambil riwayat sistem error dari database."""
    query = db.query(SystemError)
    if unread_only:
        query = query.filter(SystemError.is_read == False)
    return query.order_by(SystemError.created_at.desc()).limit(limit).offset(offset).all()

@router.put("/read-all")
def mark_all_system_errors_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Tandai semua sistem error sebagai telah dibaca."""
    db.query(SystemError).filter(SystemError.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All system errors marked as read"}

@router.put("/{error_id}/read")
def mark_system_error_read(error_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """Tandai satu sistem error sebagai telah dibaca."""
    error = db.query(SystemError).filter(SystemError.id == error_id).first()
    if error:
        error.is_read = True
        db.commit()
        return {"message": "Marked as read"}
    return {"message": "Not found"}


