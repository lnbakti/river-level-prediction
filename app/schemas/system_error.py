from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.system_error import ErrorStatus

class SystemErrorBase(BaseModel):
    pesan: str
    status_alat: str

    model_config = ConfigDict(from_attributes=True)

class SystemErrorCreate(SystemErrorBase):
    pass

class SystemErrorResponse(SystemErrorBase):
    id: int
    status_alat: ErrorStatus
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
