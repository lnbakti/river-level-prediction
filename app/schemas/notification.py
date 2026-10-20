from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.notification import NotificationStatus

class NotificationBase(BaseModel):
    id_users: int
    id_prediksi: Optional[int] = None
    pesan: str
    status: NotificationStatus = NotificationStatus.TERKIRIM

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: int
    username: Optional[str] = None
    nama_lengkap: Optional[str] = None
    no_wa: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
