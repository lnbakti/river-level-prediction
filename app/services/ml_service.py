import logging
import os
import warnings

logger = logging.getLogger(__name__)

# Global variables for caching the model and scalers in memory
_MODEL = None
_SCALER_FEATURES = None
_SCALER_WATER_LEVEL = None

import threading

_load_lock = threading.Lock()

def _load_ml_assets():
    global _MODEL, _SCALER_FEATURES, _SCALER_WATER_LEVEL
    
    if _MODEL is not None and _SCALER_FEATURES is not None and _SCALER_WATER_LEVEL is not None:
        return # Already loaded
        
    with _load_lock:
        # Double-check inside lock
        if _MODEL is not None and _SCALER_FEATURES is not None and _SCALER_WATER_LEVEL is not None:
            return
            
        try:
            # Suppress TensorFlow logging and warnings
            os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 
            import tensorflow as tf
            
            # Suppress sklearn warnings
            warnings.filterwarnings("ignore", category=UserWarning)
            import joblib
            
            # Define paths
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            ml_dir = os.path.join(base_dir, "ml")
            model_path = os.path.join(ml_dir, "model_lstm.h5")
            scaler_features_path = os.path.join(ml_dir, "scaler_features.pkl")
            scaler_target_path = os.path.join(ml_dir, "scaler_water_level.pkl")
            
            logger.info("Loading ML Model and Scalers (LSTM)...")
            
            # Load scalers
            _SCALER_FEATURES = joblib.load(scaler_features_path)
            _SCALER_WATER_LEVEL = joblib.load(scaler_target_path)
            
            # Load model
            _MODEL = tf.keras.models.load_model(model_path, compile=False)
            
            logger.info("ML assets loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load ML assets: {e}")
            raise e

def predict_water_level(sequence_data: list[list[float]]) -> dict:
    """
    Fungsi untuk memprediksi ketinggian air menggunakan logika selisih acak sederhana (tidak menggunakan ML).
    """
    if not sequence_data:
        raise ValueError("Data sequence tidak boleh kosong")
        
    try:
        current_water_level = float(sequence_data[-1][0])
        import random
        # Selisihnya digunakan lebih atau kurang dari 0,5 saja
        difference = random.uniform(-0.5, 0.5)
        prediksi_tinggi_air = current_water_level + difference
        
        # Pastikan tidak negatif
        if prediksi_tinggi_air < 0:
            prediksi_tinggi_air = 0.0
            
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        prediksi_tinggi_air = float(sequence_data[-1][0]) if sequence_data else 0.0
    
    # Penentuan Status
    if prediksi_tinggi_air >= 15:
        status = "BAHAYA"
    elif prediksi_tinggi_air >= 10:
        status = "WASPADA"
    else:
        status = "AMAN"
        
    return {
        "prediksi_tinggi_air": round(prediksi_tinggi_air, 2),
        "status": status
    }
