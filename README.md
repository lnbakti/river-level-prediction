# 🌊 Water Level Early Warning System (WLEWS)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.13%2B-FF6F00.svg?style=flat&logo=TensorFlow&logoColor=white)](https://www.tensorflow.org/)
[![ESP32](https://img.shields.io/badge/Hardware-ESP32-red.svg?style=flat&logo=espressif&logoColor=white)](https://www.espressif.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Water Level Early Warning System** adalah platform pemantauan dan peringatan dini tinggi muka air sungai berbasis **Internet of Things (IoT - ESP32)**, kecerdasan buatan (**Deep Learning LSTM**), serta integrasi notifikasi darurat instan melalui **WhatsApp Gateway**.

Sistem ini dirancang untuk mendeteksi potensi banjir secara *real-time*, memprediksi tren kenaikan air di waktu mendatang, serta menyebarkan notifikasi waspada/bahaya kepada petugas dan warga sekitar secara otomatis.

---

## 📑 Daftar Isi

- [Arsitektur Sistem](#-arsitektur-sistem)
- [Fitur Utama](#-fitur-utama)
- [Tech Stack](#-tech-stack)
- [Struktur Direktori](#-struktur-direktori)
- [Panduan Instalasi Backend](#-panduan-instalasi-backend)
- [Konfigurasi Hardware & Firmware (ESP32)](#-konfigurasi-hardware--firmware-esp32)
- [Endpoints API](#-endpoints-api)
- [Lisensi](#-lisensi)

---

## 🏗️ Arsitektur Sistem

```text
  [ ESP32 Node Sensor ]
  - Sensor Ultrasonik (Tinggi Air)
  - Sensor Curah Hujan
  - Modul SD Card (Offline Backup)
  - Modul RTC DS3231 (Timestamp)
            │
            │ HTTP POST / JSON (WiFi)
            ▼
  [ FastAPI Application Server ] ◄───► [ PostgreSQL Database ]
            │                                    │
            ├──► [ LSTM Inference Engine ] ──────┘ (Menyimpan riwayat & hasil prediksi)
            │    (app/ml/model_lstm.h5)
            │
            ├──► [ WhatsApp Gateway (Fonnte) ] ──► Notifikasi Peringatan Dini Warga / Tim SAR
            │
            └──► [ Web Dashboard & Real-Time Monitoring ]
```

---

## ✨ Fitur Utama

1. **Pemantauan Real-Time:** Menampilkan grafik ketinggian air, status debit, dan intensitas hujan secara langsung (*live*).
2. **Prediksi Ketinggian Air (LSTM):** Memanfaatkan model deep learning *Long Short-Term Memory* untuk memproyeksikan fluktuasi level air beberapa jam ke depan.
3. **Peringatan Dini Multi-Kanal (WhatsApp):** Pengiriman pesan peringatan otomatis berbasis ambang batas status (Aman, Siaga, Waspada, Bahaya).
4. **Offline Resilience (ESP32):** Menggunakan SD Card logging saat koneksi internet terputus; data otomatis disinkronkan (*sync*) ketika koneksi pulih.
5. **Pencatatan Masalah Sistem (*System Errors*):** Logging dan pelaporan otomatis jika ada sensor yang malfungsi atau koneksi jaringan terkendala.
6. **Autentikasi & Manajemen Pengguna:** Sistem role & permission berbasis JWT (JSON Web Tokens).

---

## 🧰 Tech Stack

### Backend & Machine Learning
- **Framework:** FastAPI, Uvicorn (ASGI)
- **Database ORM:** SQLAlchemy, PostgreSQL (`psycopg2-binary`)
- **Machine Learning / AI:** TensorFlow/Keras (Model LSTM `.h5`), Scikit-Learn, Pandas, NumPy
- **Authentication:** OAuth2 Password Bearer, Passlib (Bcrypt), Python-JOSE (JWT)
- **Messaging:** Fonnte WhatsApp Gateway API

### Frontend
- **Rendering:** Jinja2 Templates (FastAPI HTMLResponse)
- **UI & Layout:** Bootstrap / Tabler Dashboard UI, ApexCharts, Phosphor & Tabler Icons

### Hardware & Embedded
- **Microcontroller:** ESP32 NodeMCU
- **Sensors:** Ultrasonik (HC-SR04 / JSN-SR04T), Rain Sensor (Curah Hujan)
- **Peripherals:** RTC DS3231, MicroSD Card Module, FreeRTOS dual-tasking

---

## 📂 Struktur Direktori

```text
├── app/
│   ├── api/             # Router endpoints (auth, monitoring, predictions, users, etc.)
│   ├── core/            # Konfigurasi aplikasi & enkripsi keamanan (security, JWT)
│   ├── database/        # Inisialisasi koneksi basis data & skema SQLAlchemy
│   ├── ml/              # Model terlatih LSTM (.h5) dan Scaler (.joblib)
│   ├── models/          # Model tabel database (User, Monitoring, Prediction, dll.)
│   ├── schemas/         # Validasi data request/response (Pydantic models)
│   ├── services/        # Business logic (ML service, WhatsApp notification, sync)
│   └── main.py          # Entrypoint aplikasi FastAPI
├── assets/              # Vendor CSS, Fonts, Icons, dan Plugin JS
├── esp32/
│   └── flood_monitor/   # Source code Arduino / C++ firmware untuk ESP32
├── static/              # Asset statis kustom & script frontend per halaman
├── templates/           # Halaman HTML antarmuka (Jinja2)
├── .env.example         # Template variabel lingkungan
├── requirements.txt     # Daftar dependensi Python
└── run.py               # Runner script aplikasi
```

---

## 🚀 Panduan Instalasi Backend

### 1. Prasyarat
- Python 3.10 atau versi yang lebih baru
- PostgreSQL Server terpasang dan aktif

### 2. Kloning Repositori & Buat Virtual Environment
```bash
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME

# Buat virtual environment
python -m venv venv

# Aktivasi virtual environment:
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
```

### 3. Instal Dependensi
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan konfigurasi basis data PostgreSQL dan kredensial Fonnte WhatsApp API di file `.env`.

### 5. Inisialisasi Database & Jalankan Aplikasi
```bash
# Menjalankan aplikasi menggunakan runner script
python run.py

# Atau menggunakan uvicorn langsung:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Akses dashboard di browser melalui: `http://localhost:8000`  
Dokumentasi interaktif Swagger API: `http://localhost:8000/docs`

---

## 🔌 Konfigurasi Hardware & Firmware (ESP32)

1. Buka file [`esp32/flood_monitor/flood_monitor.ino`](file:///C:/Users/Lugas/Downloads/project/project/esp32/flood_monitor/flood_monitor.ino) menggunakan Arduino IDE atau PlatformIO.
2. Pasang library yang dibutuhkan:
   - `RTClib` (by Adafruit)
   - `SD` dan `SPI` (bawaan ESP32 Core)
   - `HTTPClient` dan `WiFi`
3. Sesuaikan konfigurasi WiFi dan alamat backend server pada baris:
   ```cpp
   const char* WIFI_SSID = "NAMA_WIFI_ANDA";
   const char* WIFI_PASSWORD = "PASSWORD_WIFI";
   const char* BACKEND_URL = "http://IP_KOMPUTER_SERVER:8000/api/monitoring";
   ```
4. Hubungkan ESP32 dan upload program (*Flash*).

---

## 📡 Endpoints API Utama

| Metode | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/monitoring` | Menerima data telemetri ketinggian air & hujan dari ESP32 |
| `GET`  | `/api/monitoring/latest` | Mengambil data pembacaan sensor paling mutakhir |
| `POST` | `/api/predictions/predict` | Memicu prediksi tinggi air berbasis model LSTM |
| `POST` | `/api/auth/login` | Otentikasi pengguna & pembuatan access token JWT |
| `POST` | `/api/notifications/send` | Mengirim notifikasi darurat via WhatsApp Gateway |

---

## 📄 Lisensi
Proyek ini dilisensikan di bawah [MIT License](LICENSE).
