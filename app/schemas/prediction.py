from pydantic import BaseModel, ConfigDict, model_serializer
from datetime import datetime, timezone, timedelta
from app.models.prediction import PredictionStatus

WIB = timezone(timedelta(hours=7))

class PredictionResponse(BaseModel):
    id: int
    timestamp: datetime
    prediksi: float
    status: PredictionStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_serializer
    def serialize_model(self):
        """Format angka 2 desimal dan konversi waktu ke WIB."""
        ts = self.timestamp
        ca = self.created_at
        
        if ts and ts.tzinfo is None:
            ts = ts.replace(tzinfo=WIB)
        elif ts:
            ts = ts.astimezone(WIB)
            
        if ca and ca.tzinfo is None:
            ca = ca.replace(tzinfo=WIB)
        elif ca:
            ca = ca.astimezone(WIB)
        
        return {
            "id": self.id,
            "timestamp": ts.isoformat() if ts else None,
            "prediksi": round(self.prediksi, 2),
            "status": self.status.value,
            "created_at": ca.isoformat() if ca else None,
        }
