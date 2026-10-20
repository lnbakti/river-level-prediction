from app.models.user import User
from app.core.security import get_current_user
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(limit: int = 50, offset: int = 0, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mengambil riwayat notifikasi dari database beserta data user."""
    from app.models.user import User, UserRole
    query = db.query(Notification, User).join(User, Notification.id_users == User.id)
    if current_user.role != UserRole.ADMIN:
        query = query.filter(Notification.id_users == current_user.id)
    results = query.order_by(Notification.created_at.desc()).limit(limit).offset(offset).all()
    
    response = []
    for notif, user in results:
        response.append({
            "id": notif.id,
            "id_users": notif.id_users,
            "id_prediksi": notif.id_prediksi,
            "pesan": notif.pesan,
            "status": notif.status,
            "created_at": notif.created_at,
            "updated_at": notif.updated_at,
            "username": user.username,
            "nama_lengkap": user.nama_lengkap,
            "no_wa": user.no_wa
        })
    return response
