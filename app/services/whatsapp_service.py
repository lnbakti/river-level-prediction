import os
import time
import requests
import logging

# Mengambil Fonnte API Key dari environment variables (.env)
FONNTE_API_KEY = os.getenv("FONNTE_API_KEY", "")

def send_whatsapp_message(nomor_tujuan: str, pesan: str) -> bool:
    """
    Mengirim pesan WhatsApp menggunakan API Fonnte.
    Menerapkan pola Exponential Backoff untuk menangani delay/kegagalan sementara (offline).
    """
    url = "https://api.fonnte.com/send"
    headers = {
        "Authorization": FONNTE_API_KEY
    }
    data = {
        "target": nomor_tujuan,
        "message": pesan,
        "delay": "1"
    }

    max_retries = 3
    backoff_time = 2  # Mulai dengan 2 detik (2, 4, 8)

    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, data=data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                if result.get("status"):
                    # Pesan berhasil dikirim (diterima oleh Fonnte)
                    return True
                else:
                    logging.warning(f"Fonnte Response Error: {result.get('reason')}")
            else:
                logging.warning(f"Fonnte HTTP Error: {response.status_code}")
        except requests.exceptions.RequestException as e:
            logging.error(f"Fonnte Network Error: {e}")
        
        # Exponential backoff mechanism
        if attempt < max_retries - 1:
            time.sleep(backoff_time)
            backoff_time *= 2

    # Jika semua percobaan (retries) gagal
    return False
