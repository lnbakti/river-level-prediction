from app.core.security import get_current_user
from app.models.user import User
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.monitoring import MonitoringCreate, MonitoringResponse
from app.services.monitoring_service import save_monitoring_data

router = APIRouter()

from typing import List, Optional

@router.post("", response_model=List[MonitoringResponse])
@router.post("/", response_model=List[MonitoringResponse])
def create_monitoring(data: List[MonitoringCreate], db: Session = Depends(get_db)):
    return save_monitoring_data(db=db, monitoring_data_list=data)

from app.models.monitoring import Monitoring
from sqlalchemy.orm import joinedload
from app.models.prediction_detail import PredictionDetail
from datetime import timedelta, timezone
from fastapi import HTTPException

WIB = timezone(timedelta(hours=7))

@router.get("/")
def get_monitoring_history(limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = db.query(Monitoring).options(
        joinedload(Monitoring.prediction_details).joinedload(PredictionDetail.prediction)
    ).order_by(Monitoring.timestamp.desc()).limit(limit).all()
    
    result = []
    for r in records:
        ts = r.timestamp
        ca = r.created_at
        if ts and ts.tzinfo is None: ts = ts.replace(tzinfo=WIB)
        elif ts: ts = ts.astimezone(WIB)
        if ca and ca.tzinfo is None: ca = ca.replace(tzinfo=WIB)
        elif ca: ca = ca.astimezone(WIB)
        
        pred_val = None
        pred_status = None
        pred_ts = None
        pred_ca = None
        if r.prediction_details and r.prediction_details[0].prediction:
            pred_val = round(r.prediction_details[0].prediction.prediksi, 2)
            pred_status = r.prediction_details[0].prediction.status.value
            
            p_ts = r.prediction_details[0].prediction.timestamp
            if p_ts:
                if p_ts.tzinfo is None: p_ts = p_ts.replace(tzinfo=WIB)
                else: p_ts = p_ts.astimezone(WIB)
                pred_ts = p_ts.isoformat()
                
            p_ca = r.prediction_details[0].prediction.created_at
            if p_ca:
                if p_ca.tzinfo is None: p_ca = p_ca.replace(tzinfo=WIB)
                else: p_ca = p_ca.astimezone(WIB)
                pred_ca = p_ca.isoformat()
            
        result.append({
            "id": r.id,
            "timestamp": ts.isoformat() if ts else None,
            "tinggi_air": round(r.tinggi_air, 2),
            "hujan": round(r.hujan, 2),
            "prediksi_tinggi_air": pred_val,
            "status_prediksi": pred_status,
            "prediksi_timestamp": pred_ts,
            "prediksi_created_at": pred_ca,
            "created_at": ca.isoformat() if ca else None
        })
    return result

@router.get("/latest", response_model=Optional[MonitoringResponse])
def get_latest_monitoring(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    latest = db.query(Monitoring).order_by(Monitoring.created_at.desc()).first()
    return latest

@router.get("/{record_id}")
def get_monitoring_by_id(record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Monitoring).options(
        joinedload(Monitoring.prediction_details).joinedload(PredictionDetail.prediction)
    ).filter(Monitoring.id == record_id).first()
    
    if not r:
        raise HTTPException(status_code=404, detail="Data not found")
        
    ts = r.timestamp
    ca = r.created_at
    if ts and ts.tzinfo is None: ts = ts.replace(tzinfo=WIB)
    elif ts: ts = ts.astimezone(WIB)
    if ca and ca.tzinfo is None: ca = ca.replace(tzinfo=WIB)
    elif ca: ca = ca.astimezone(WIB)
    
    pred_val = None
    pred_status = None
    pred_ts = None
    pred_ca = None
    if r.prediction_details and r.prediction_details[0].prediction:
        pred_val = round(r.prediction_details[0].prediction.prediksi, 2)
        pred_status = r.prediction_details[0].prediction.status.value
        
        p_ts = r.prediction_details[0].prediction.timestamp
        if p_ts:
            if p_ts.tzinfo is None: p_ts = p_ts.replace(tzinfo=WIB)
            else: p_ts = p_ts.astimezone(WIB)
            pred_ts = p_ts.isoformat()
            
        p_ca = r.prediction_details[0].prediction.created_at
        if p_ca:
            if p_ca.tzinfo is None: p_ca = p_ca.replace(tzinfo=WIB)
            else: p_ca = p_ca.astimezone(WIB)
            pred_ca = p_ca.isoformat()
        
    return {
        "id": r.id,
        "timestamp": ts.isoformat() if ts else None,
        "tinggi_air": round(r.tinggi_air, 2),
        "hujan": round(r.hujan, 2),
        "prediksi_tinggi_air": pred_val,
        "status_prediksi": pred_status,
        "prediksi_timestamp": pred_ts,
        "prediksi_created_at": pred_ca,
        "created_at": ca.isoformat() if ca else None
    }
