import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost,http://127.0.0.1").split(",") if origin.strip()]
ML_API_URL = os.getenv("ML_API_URL", "http://127.0.0.1:8001/predict")
