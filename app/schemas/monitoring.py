from pydantic import BaseModel, ConfigDict, Field, model_serializer
from datetime import datetime, timezone, timedelta

# Timezone WIB (UTC+7)
WIB = timezone(timedelta(hours=7))

class MonitoringCreate(BaseModel):
    """
    Schema untuk menerima payload JSON dari modul ESP32.
    """
    timestamp: datetime = Field(..., description="Waktu pencatatan dari modul RTC DS3231 (WIB)")
    tinggi_air: float = Field(..., ge=0.00, description="Ketinggian air sungai")
    hujan: float = Field(..., ge=0.00, description="Curah hujan (mm)")

class MonitoringResponse(BaseModel):
    """
    Schema untuk mengembalikan rekaman data monitoring ke Frontend.
    Semua angka diformat 2 desimal. Waktu dalam zona WIB.
    """
    id: int
    timestamp: datetime
    tinggi_air: float
    hujan: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_serializer
    def serialize_model(self):
        """Format angka 2 desimal dan konversi waktu ke WIB untuk tampilan web."""
        ts = self.timestamp
        ca = self.created_at
        
        # Konversi ke WIB jika belum ada timezone info
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
            "tinggi_air": round(self.tinggi_air, 2),
            "hujan": round(self.hujan, 2),
            "created_at": ca.isoformat() if ca else None,
        }
