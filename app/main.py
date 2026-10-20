from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import uvicorn
import os
# Import database connection and session maker
from app.database.database import get_db, engine, Base
from app.core.config import BACKEND_HOST, BACKEND_PORT, CORS_ORIGINS
from app import models
# Buat tabel otomatis jika belum ada di database
Base.metadata.create_all(bind=engine)
from contextlib import asynccontextmanager
import asyncio
from app.services.offline_monitor import monitor_offline_status
@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(monitor_offline_status())
    yield
    task.cancel()
app = FastAPI(
    title="Water Level System API",
    description="Backend API untuk Sistem Peringatan Dini Ketinggian Air Sungai",
    version="1.0.0",
    lifespan=lifespan
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from app.api import monitoring, users, auth, predictions, system_error, notifications
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["Monitoring"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(system_error.router, prefix="/api/system-error", tags=["SystemError"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# Serve Web UI (Full-stack Monolith)
app.mount('/static', StaticFiles(directory='static'), name='static')
app.mount('/assets', StaticFiles(directory='assets'), name='assets')
@app.get('/dashboard/index.html', tags=['UI'])
def alias_dashboard():
    return FileResponse('templates/dashboard/index.html')

@app.get('/', tags=['UI'])
def serve_index():
    return FileResponse("templates/dashboard/index.html")
@app.get("/login", tags=["UI"])
def serve_login():
    return FileResponse("templates/auth/login.html")
@app.get("/register", tags=["UI"])
def serve_register():
    return FileResponse("templates/auth/register.html")
@app.get("/forgot-password", tags=["UI"])
def serve_forgot_password():
    return FileResponse("templates/auth/forgot-password.html")
@app.get("/monitoring", tags=["UI"])
def serve_monitoring():
    return FileResponse("templates/monitoring/index.html")
@app.get("/prediction", tags=["UI"])
def serve_prediction():
    return FileResponse("templates/prediction/index.html")
@app.get('/monitoring/detail', tags=['UI'])
def serve_monitoring_detail():
    return FileResponse('templates/monitoring/detail.html')

@app.get('/prediction/detail', tags=['UI'])
def serve_prediction_detail():
    return FileResponse('templates/prediction/detail.html')

@app.get("/users", tags=["UI"])
def serve_users():
    return FileResponse("templates/users/index.html")
@app.get('/users/detail', tags=['UI'])
def serve_users_detail():
    return FileResponse('templates/users/detail.html')

@app.get('/users/edit', tags=['UI'])
def serve_users_edit():
    return FileResponse('templates/users/edit.html')

@app.get("/profile", tags=["UI"])
def serve_profile():
    return FileResponse("templates/profile/index.html")

@app.get("/notifications/warning", tags=["UI"])
def serve_notif_warning():
    return FileResponse("templates/notification/warning.html")
@app.get('/notifications/warning/detail', tags=['UI'])
def serve_notif_warning_detail():
    return FileResponse('templates/notification/warning_detail.html')

@app.get("/notifications/error", tags=["UI"])
def serve_notif_error():
    return FileResponse("templates/notification/error.html")
@app.get('/notifications/error/detail', tags=['UI'])
def serve_notif_error_detail():
    return FileResponse('templates/notification/error_detail.html')

@app.get("/403", tags=["UI"])
def serve_403():
    return FileResponse("templates/errors/403.html")
@app.get("/layouts/sidebar.html", tags=["UI-Components"])
def serve_sidebar():
    return FileResponse("templates/components/sidebar.html")
@app.get("/layouts/header.html", tags=["UI-Components"])
def serve_header():
    return FileResponse("templates/components/header.html")
@app.get("/layouts/footer.html", tags=["UI-Components"])
def serve_footer():
    return FileResponse("templates/components/footer.html")
@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}

