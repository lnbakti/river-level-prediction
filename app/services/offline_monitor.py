import asyncio
import random
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.database import SessionLocal
from app.models.monitoring import Monitoring
from app.models.system_error import SystemError, ErrorStatus

async def monitor_offline_status():
    # Tidur secara acak di awal agar jika ada 4 worker, mereka tidak berjalan persis bersamaan
    await asyncio.sleep(random.uniform(0, 2))
    
    while True:
        await asyncio.sleep(2) # Cek sangat cepat setiap 2 detik
        
        try:
            db: Session = SessionLocal()
            latest = db.query(Monitoring).order_by(Monitoring.created_at.desc()).first()
            
            if latest:
                db_now = db.query(func.now()).scalar()
                
                # Pastikan datetime naive atau timezone-aware cocok
                if db_now.tzinfo and not latest.created_at.tzinfo:
                    latest.created_at = latest.created_at.replace(tzinfo=db_now.tzinfo)
                elif latest.created_at.tzinfo and not db_now.tzinfo:
                    db_now = db_now.replace(tzinfo=latest.created_at.tzinfo)
                    
                delta_seconds = (db_now - latest.created_at).total_seconds()
                
                # Cek status terakhir di database untuk mencegah duplikasi (karena ada 4 worker Uvicorn)
                last_error = db.query(SystemError).order_by(SystemError.id.desc()).first()
                is_currently_offline_in_db = last_error and last_error.status_alat == ErrorStatus.OFFLINE
                
                if delta_seconds > 45:
                    if not is_currently_offline_in_db:
                        # Baru saja berubah menjadi offline
                        
                        # Beri jeda acak sebentar lalu cek lagi untuk menghindari race condition antar worker
                        await asyncio.sleep(random.uniform(0.1, 0.5))
                        from app.models.user import User
                        admin_user = db.query(User).filter(User.role == "Admin").first()
                        admin_id = admin_user.id if admin_user else None

                        last_check = db.query(SystemError).order_by(SystemError.id.desc()).first()
                        if not (last_check and last_check.status_alat == ErrorStatus.OFFLINE):
                            error_msg = "Sistem tidak menerima data lebih dari 45 detik. Status: OFFLINE."
                            db_error = SystemError(
                                id_users=admin_id, 
                                status_alat=ErrorStatus.OFFLINE,
                                pesan=error_msg,
                                is_read=False
                            )
                            db.add(db_error)
                            db.commit()
                        
                elif delta_seconds <= 45:
                    if is_currently_offline_in_db:
                        # Baru saja kembali online
                        
                        # Beri jeda acak sebentar lalu cek lagi
                        from app.models.user import User
                        admin_user = db.query(User).filter(User.role == "Admin").first()
                        admin_id = admin_user.id if admin_user else None

                        last_check = db.query(SystemError).order_by(SystemError.id.desc()).first()
                        if last_check and last_check.status_alat == ErrorStatus.OFFLINE:
                            db_error = SystemError(
                                id_users=admin_id, 
                                status_alat=ErrorStatus.ONLINE,
                                pesan="Sistem telah kembali Online dan menerima data dengan normal.",
                                is_read=False
                            )
                            db.add(db_error)
                            db.commit()
                    
        except Exception as e:
            print(f"Offline monitor task error: {e}")
        finally:
            db.close()
