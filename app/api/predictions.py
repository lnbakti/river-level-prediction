from app.core.security import get_current_user
from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.database import get_db
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionResponse

router = APIRouter()

@router.get("/latest", response_model=Optional[PredictionResponse])
def get_latest_prediction(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mengambil 1 data prediksi paling baru untuk status utama di Dashboard."""
    pred = db.query(Prediction).order_by(Prediction.timestamp.desc()).first()
    return pred

@router.get("/history", response_model=List[PredictionResponse])
def get_prediction_history(limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mengambil riwayat prediksi untuk grafik."""
    return db.query(Prediction).order_by(Prediction.timestamp.desc()).limit(limit).all()

from pydantic import BaseModel
class PredictionRequest(BaseModel):
    # Diharapkan array 2D dengan panjang 'seq_length' dan 2 fitur (tinggi_air, hujan)
    sequence: list[list[float]]

@router.post("/predict")
def predict(payload: PredictionRequest):
    """
    Endpoint untuk melakukan prediksi ML realtime via REST API.
    Akan dikalkulasikan oleh TensorFlow/LSTM atau Dummy Logic (fallback).
    """
    from app.services.ml_service import predict_water_level
    try:
        result = predict_water_level(payload.sequence)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

from typing import Union, List

class InjectPredictionRequest(BaseModel):
    prediksi_tinggi_air: Union[float, List[float]]

@router.post("/inject")
def inject_prediction(payload: InjectPredictionRequest, db: Session = Depends(get_db)):
    """
    Endpoint untuk Testing / Suntik nilai prediksi buatan dari Postman.
    Ini juga akan memicu sistem WhatsApp Notifikasi jika status BAHAYA.
    Mendukung satu nilai (float) atau banyak nilai sekaligus (list).
    """
    from app.models.prediction import PredictionStatus
    from datetime import datetime, timedelta
    from app.models.user import User, UserStatus, UserNotifStatus
    from app.models.notification import Notification, NotificationStatus
    from app.services.whatsapp_service import send_whatsapp_message
    
    values = payload.prediksi_tinggi_air if isinstance(payload.prediksi_tinggi_air, list) else [payload.prediksi_tinggi_air]
    
    results = []
    base_time = datetime.now() - timedelta(minutes=len(values))
    
    for i, val in enumerate(values):
        if val >= 25:
            status_enum = PredictionStatus.BAHAYA
        elif val >= 15:
            status_enum = PredictionStatus.WASPADA
        else:
            status_enum = PredictionStatus.AMAN
            
        print(f"INFO:     [INJECT] Memproses angka: {val} cm | Status: {status_enum.value}")
            
        new_prediction = Prediction(
            timestamp=base_time + timedelta(minutes=i+1),
            prediksi=val,
            status=status_enum
        )
        db.add(new_prediction)
        db.commit()
        db.refresh(new_prediction)
        
        # 4. Trigger Peringatan Dini WhatsApp HANYA jika status BAHAYA
        if new_prediction.status == PredictionStatus.BAHAYA:
            users_to_notify = db.query(User).filter(
                User.status_akun == UserStatus.AKTIF,
                User.status_notif == UserNotifStatus.AKTIF
            ).all()
            
            pesan = (
                f"*[PERINGATAN DINI KETINGGIAN AIR]*\n\n"
                f"Sistem mendeteksi potensi status: *{new_prediction.status.value}*\n"
                f"Prediksi 30 menit ke depan: {val:.2f} cm.\n\n"
                f"Harap selalu waspada dan pantau dashboard untuk info terkini.\n(TEST INJECTION)"
            )
            
            cooldown_threshold = datetime.now() - timedelta(minutes=15)
            
            for user in users_to_notify:
                recent_notif = db.query(Notification).filter(
                    Notification.id_users == user.id,
                    Notification.status == NotificationStatus.TERKIRIM,
                    Notification.created_at >= cooldown_threshold
                ).first()
                
                if recent_notif:
                    print(f"INFO:     [WhatsApp] Cooldown aktif. Melewati pengiriman ke {user.no_wa}")
                    continue # Skip user ini karena masih dalam cooldown 15 menit
                    
                success = send_whatsapp_message(user.no_wa, pesan)
                
                if success:
                    print(f"INFO:     [WhatsApp] Pesan berhasil terkirim ke {user.no_wa}")
                else:
                    print(f"ERROR:    [WhatsApp] Gagal mengirim pesan ke {user.no_wa}")
                
                notif_log = Notification(
                    id_users=user.id,
                    id_prediksi=new_prediction.id,
                    pesan=pesan,
                    status=NotificationStatus.TERKIRIM if success else NotificationStatus.GAGAL
                )
                db.add(notif_log)
            
            db.commit()
        
        results.append({"prediksi": val, "status": status_enum.value})

    return {"message": f"Injeksi {len(values)} data berhasil", "data": results}

