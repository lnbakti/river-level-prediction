from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import requests
from datetime import datetime

from app.models.monitoring import Monitoring
from app.models.prediction import Prediction, PredictionStatus
from app.models.prediction_detail import PredictionDetail
from app.models.user import User, UserNotifStatus, UserStatus
from app.models.notification import Notification, NotificationStatus
from app.schemas.monitoring import MonitoringCreate
from app.services.whatsapp_service import send_whatsapp_message
from app.core.config import ML_API_URL

def save_monitoring_data(db: Session, monitoring_data_list: List[MonitoringCreate]) -> List[Monitoring]:
    """
    Menerima List data telemetri JSON dari ESP32, lalu menyimpannya ke tabel monitoring.
    Setelah disimpan, melakukan trigger ML-System dan notifikasi WhatsApp jika perlu.
    """
    
    saved_records = []
    
    try:
        # Dapatkan semua timestamp dari data yang masuk
        incoming_timestamps = [data.timestamp for data in monitoring_data_list]
        
        # Cek timestamp mana saja yang sudah ada di database
        existing_records = db.query(Monitoring.timestamp).filter(Monitoring.timestamp.in_(incoming_timestamps)).all()
        
        # Konversi ke string ISO format agar komparasinya aman (foolproof) dari perbedaan internal object timezone
        existing_timestamps = {r[0].isoformat() for r in existing_records if r[0]}
        
        for data in monitoring_data_list:
            ts_iso = data.timestamp.isoformat()
            if ts_iso in existing_timestamps:
                continue
                
            db_monitoring = Monitoring(
                timestamp=data.timestamp,
                tinggi_air=data.tinggi_air,
                hujan=data.hujan
            )
            db.add(db_monitoring)
            saved_records.append(db_monitoring)
            
            # Tambahkan ke existing_timestamps untuk mencegah duplikasi di dalam payload yang sama
            existing_timestamps.add(ts_iso)
        
        db.commit()
        for record in saved_records:
            db.refresh(record)
            
        # Jika tidak ada record baru yang disimpan (semua duplikat), kita bisa return langsung
        if not saved_records:
            return []
            
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terjadi kesalahan saat menyimpan data sensor ke database: {str(e)}"
        )

    # 2. Trigger ML System (ambil 24 data terakhir yang paling baru, sesuai seq_length LSTM)
    try:
        last_60 = db.query(Monitoring).order_by(Monitoring.timestamp.desc()).limit(60).all()
        
        if len(last_60) == 60:
            # Balik urutan menjadi kronologis (terlama -> terbaru)
            last_60.reverse()
            
            # Bentuk payload untuk ML System (array of [tinggi_air, hujan])
            sequence_data = [[item.tinggi_air, item.hujan] for item in last_60]
            
            # Panggil fungsi ML lokal secara langsung, tanpa request HTTP
            from app.services.ml_service import predict_water_level
            result = predict_water_level(sequence_data)
            
            # 3. Simpan Hasil Prediksi ke DB
            prediksi_value = result["prediksi_tinggi_air"]
            pred_status = result["status"]
            
            from datetime import timedelta
            
            # Timestamp prediksi adalah target masa depan (+30 menit dari data IoT terakhir)
            future_timestamp = last_60[-1].timestamp + timedelta(minutes=30)
            
            new_prediction = Prediction(
                timestamp=future_timestamp,
                prediksi=prediksi_value,
                status=PredictionStatus(pred_status)
            )
            db.add(new_prediction)
            db.commit()
            db.refresh(new_prediction)
            
            # Simpan detail relasi (tabel prediksi_detail)
            for item in last_60:
                detail = PredictionDetail(
                    id_monitoring=item.id,
                    id_prediksi=new_prediction.id
                )
                db.add(detail)
            db.commit()
            
            # 4. Trigger Peringatan Dini WhatsApp HANYA jika status BAHAYA (sesuai instruksi revisi)
            if new_prediction.status == PredictionStatus.BAHAYA:
                users_to_notify = db.query(User).filter(
                    User.status_akun == UserStatus.AKTIF,
                    User.status_notif == UserNotifStatus.AKTIF
                ).all()
                
                pesan = (
                    f"*[PERINGATAN DINI KETINGGIAN AIR]*\n\n"
                    f"Sistem mendeteksi potensi status: *{new_prediction.status.value}*\n"
                    f"Prediksi 30 menit ke depan: {prediksi_value:.2f} cm.\n\n"
                    f"Harap selalu waspada dan pantau dashboard untuk info terkini."
                )
                
                # Cek cooldown 15 menit
                from datetime import timedelta
                cooldown_threshold = datetime.now() - timedelta(minutes=15)
                
                for user in users_to_notify:
                    # Cek apakah user ini sudah menerima notif sukses dalam 15 menit terakhir
                    recent_notif = db.query(Notification).filter(
                        Notification.id_users == user.id,
                        Notification.status == NotificationStatus.TERKIRIM,
                        Notification.created_at >= cooldown_threshold
                    ).first()
                    
                    if recent_notif:
                        print(f"[COOLDOWN ACTIVE] Melewati pengiriman ke {user.no_wa} (Harus menunggu 15 menit).")
                        continue # Skip user ini karena masih dalam cooldown 15 menit
                        
                    # Fonnte service mengirim dengan exponential backoff (dijalankan di thread terpisah)
                    import threading
                    threading.Thread(target=send_whatsapp_message, args=(user.no_wa, pesan)).start()
                    
                    # Catat history ke tabel notifikasi (kita asumsikan pending/diproses)
                    notif_log = Notification(
                        id_users=user.id,
                        id_prediksi=new_prediction.id,
                        pesan=pesan,
                        status=NotificationStatus.TERKIRIM 
                    )
                    db.add(notif_log)
                
                db.commit()

    except Exception as e:
        # Kita log error ini tapi tidak mereturn error 500 ke ESP32,
        # supaya ESP32 tahu data sudah tersimpan (return 200) dan menghapus flag offline-nya.
        print(f"Error triggering ML pipeline or Fonnte: {e}")

    return saved_records
