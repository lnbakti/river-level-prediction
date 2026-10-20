#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <FS.h>
#include <SD.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <RTClib.h>
#include <esp_task_wdt.h>

// ==========================================
// KONFIGURASI PENGGUNA
// ==========================================
const char* WIFI_SSID = "Galaxy A15 9217";
const char* WIFI_PASSWORD = "password";
const char* BACKEND_URL = "http://10.232.253.22:8000/api/monitoring"; // Sesuaikan dengan IP Anda jika berubah

#define PIN_TRIG 33
#define PIN_ECHO 32
#define PIN_RAIN 34
#define PIN_SD_CS 5

#define MA_WINDOW 10 // Window Moving Average (10 sample = 10 detik)

// ==========================================
// GLOBAL VARIABLES & MUTEX
// ==========================================
RTC_DS3231 rtc;
SemaphoreHandle_t sdMutex;

float maBufferAir[MA_WINDOW];
uint8_t maIndexAir = 0;
uint8_t fillCount = 0;

TaskHandle_t TaskSensorHandle;
TaskHandle_t TaskWiFiHandle;

// ==========================================
// FUNGSI NOTIFIKASI ERROR KE DASHBOARD
// ==========================================
void sendSystemError(String pesan, String status) {
  Serial.println("[SYSTEM ERROR] Mencoba mengirim laporan kerusakan ke server...");
  
  // Koneksi WiFi Darurat
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    uint8_t tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 15) {
      delay(500);
      tries++;
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    String baseUrl = String(BACKEND_URL);
    // Kita hapus kata terakhir setelah slash (misal "monitoring" atau "sensor")
    String errorUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/')) + "/system-error";

    String payload = "{\"pesan\":\"" + pesan + "\",\"status_alat\":\"" + status + "\"}";
    
    HTTPClient http;
    // Pastikan URL diawali http://
    if (!errorUrl.startsWith("http")) errorUrl = "http://" + errorUrl;
    
    http.begin(errorUrl);
    http.addHeader("Content-Type", "application/json");
    int rc = http.POST(payload);
    if (rc == 200 || rc == 201) {
      Serial.println("  ↳ Laporan terkirim ke Admin!");
    } else {
      Serial.printf("  ↳ Gagal mengirim laporan (HTTP %d)\n", rc);
    }
    http.end();
  } else {
    Serial.println("  ↳ Gagal mengirim laporan: WiFi tidak terhubung!");
  }
}

// ==========================================
// DIAGNOSTIK / POST (Power-On Self-Test)
// ==========================================
bool runPOST(bool is_last_try) {
  bool all_ok = true;
  String errorMsg = "Hardware Failure: ";
  Serial.println("\n[POST] Memulai Diagnostik Hardware...");

  // 1. Cek RTC
  Serial.print("  ↳ Cek Modul RTC DS3231... ");
  Wire.begin(21, 22); // SDA=21, SCL=22
  if (!rtc.begin()) {
    Serial.println("GAGAL! (Kabel SDA/SCL terputus atau modul rusak)");
    errorMsg += "RTC Gagal; ";
    all_ok = false;
  } else {
    Serial.println("OK!");
  }

  // 2. Cek SD Card
  Serial.print("  ↳ Cek Modul SD Card... ");
  SPI.begin(18, 19, 23, PIN_SD_CS);
  if (!SD.begin(PIN_SD_CS, SPI, 4000000)) {
    Serial.println("GAGAL! (Kartu tidak terbaca atau format salah)");
    errorMsg += "SD Card Gagal; ";
    all_ok = false;
  } else {
    Serial.println("OK!");
  }

  // 3. Cek Sensor HC-SR04
  Serial.print("  ↳ Cek Sensor HC-SR04... ");
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long duration = pulseIn(PIN_ECHO, HIGH, 30000);
  if (duration == 0) {
    Serial.println("GAGAL! (Tidak ada pantulan, cek kabel Echo/Trig)");
    errorMsg += "Ultrasonik Gagal; ";
    all_ok = false;
  } else {
    Serial.println("OK!");
  }

  // 4. Cek Sensor Hujan MH-RD
  Serial.print("  ↳ Cek Sensor Hujan MH-RD... ");
  int rainRaw = analogRead(PIN_RAIN);
  if (rainRaw == 0 || rainRaw >= 4095) { 
    Serial.println("OK! (Catatan: Nilai mentah mentok di 4095/0)");
  } else {
    Serial.println("OK!");
  }

  Serial.println("[POST] Diagnostik Selesai.\n");
  
  if (!all_ok && is_last_try) {
     sendSystemError(errorMsg, "Error");
  }
  
  return all_ok;
}

// ==========================================
// INISIALISASI (SETUP)
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n--- SISTEM PENDETEKSI BANJIR (ALUR 1) MULAI ---");

  // Inisialisasi Mutex untuk SD Card
  sdMutex = xSemaphoreCreateMutex();

  // Pin Setup
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_RAIN, INPUT);

  // Jalankan Diagnostik Maksimal 3 Kali
  bool post_success = false;
  for (int i = 1; i <= 3; i++) {
    if (i > 1) {
       Serial.printf("Mengulang Diagnostik (Percobaan %d/3)...\n", i);
       delay(2000);
    }
    bool is_last = (i == 3);
    if (runPOST(is_last)) {
       post_success = true;
       break;
    }
  }

  if (!post_success) {
    Serial.println("!!! PERINGATAN KEMATIAN (FATAL ERROR) !!!");
    Serial.println("Komponen hardware gagal merespons setelah 3 kali percobaan.");
    Serial.println("Memicu WDT / Restart Paksa dalam 3 detik...");
    delay(3000);
    ESP.restart(); // Restart alat secara paksa
  }

  // WDT Setup (Timeout 15 detik)
  esp_task_wdt_config_t wdt_config = {
      .timeout_ms = 15000,
      .idle_core_mask = (1 << portNUM_PROCESSORS) - 1,
      .trigger_panic = true
  };
  esp_task_wdt_init(&wdt_config);

  // Buat 2 Task Utama (Core 1 untuk Hardware, Core 0 untuk WiFi)
  xTaskCreatePinnedToCore(taskSensor, "TaskSensor", 4096, NULL, 2, &TaskSensorHandle, 1);
  xTaskCreatePinnedToCore(taskWiFi, "TaskWiFi", 8192, NULL, 1, &TaskWiFiHandle, 0);
}

void loop() {
  // Loop bawaan Arduino tidak digunakan, semua dihandle Task.
  vTaskDelete(NULL);
}

// ==========================================
// TASK 1: SENSOR & PENYIMPANAN (CORE 1)
// ==========================================
void taskSensor(void *param) {
  esp_task_wdt_add(NULL);
  
  uint8_t ultraFailCount = 0;
  uint8_t sdFailCount = 0;
  
  for (;;) {
    esp_task_wdt_reset(); // Beri makan Watchdog
    
    // 1. BACA SENSOR (Tiap 1 Detik)
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);
    long duration = pulseIn(PIN_ECHO, HIGH, 30000);
    
    // --- PENGECEKAN KABEL ULTRASONIK PUTUS ---
    if (duration == 0) {
      ultraFailCount++;
      if (ultraFailCount >= 5) {
        Serial.println("!!! FATAL ERROR: Sensor Ultrasonik tidak merespons (kabel putus). Memicu Restart...");
        sendSystemError("Sensor Ultrasonik mendadak tidak merespons di tengah operasi!", "Error");
        delay(3000);
        ESP.restart();
      }
    } else {
      ultraFailCount = 0; // Reset hitungan jika normal
    }
    // -----------------------------------------
    
    float distance_cm = duration * 0.0343 / 2.0;
    
    float raw_air = 18.5 - distance_cm;
    if (raw_air < 0) raw_air = 0;
    if (raw_air > 18.5) raw_air = 18.5;

    int rainRaw = analogRead(PIN_RAIN);
    float hujan = map(rainRaw, 4095, 0, 0, 1000) / 10.0;
    if (hujan < 0) hujan = 0;
    if (hujan > 100) hujan = 100;

    // 2. HITUNG MOVING AVERAGE (MA 10)
    maBufferAir[maIndexAir] = raw_air;
    maIndexAir = (maIndexAir + 1) % MA_WINDOW;
    if (fillCount < MA_WINDOW) fillCount++;

    float sumAir = 0;
    for (uint8_t i = 0; i < fillCount; i++) {
      sumAir += maBufferAir[i];
    }
    float ma_air = sumAir / fillCount;

    // 3. AMBIL WAKTU SEKARANG
    DateTime now = rtc.now();
    char timestamp[30];
    snprintf(timestamp, sizeof(timestamp), "%04d-%02d-%02dT%02d:%02d:%02d+07:00",
             now.year(), now.month(), now.day(), now.hour(), now.minute(), now.second());
             
    char date_only[15];
    snprintf(date_only, sizeof(date_only), "%04d-%02d-%02d", now.year(), now.month(), now.day());

    Serial.printf("➤ [AKUISISI] %s | Air: %05.2f cm (Raw: %05.2f cm) | Hujan: %05.2f%%\n", timestamp, ma_air, raw_air, hujan);

    // 4. SIMPAN KE SD CARD (Log Harian + Antrean Offline)
    if (xSemaphoreTake(sdMutex, pdMS_TO_TICKS(500)) == pdTRUE) {
      bool sd_write_success = false;
      
      // Simpan Arsip Harian
      String logFile = String("/") + date_only + "-log.csv";
      bool exists = SD.exists(logFile);
      File f1 = SD.open(logFile, FILE_APPEND);
      if (f1) {
        if (!exists) f1.println("timestamp,tinggi_air_raw,tinggi_air_ma,hujan");
        f1.printf("%s,%.2f,%.2f,%.2f\n", timestamp, raw_air, ma_air, hujan);
        f1.close();
        sd_write_success = true;
      }

      // Masukkan ke Antrean Sinkronisasi (Offline Buffer)
      if (sd_write_success) {
        File f2 = SD.open("/unsynced.csv", FILE_APPEND);
        if (f2) {
          f2.printf("%s,%.2f,%.2f\n", timestamp, ma_air, hujan); 
          f2.close();
        } else {
          sd_write_success = false;
        }
      }
      
      xSemaphoreGive(sdMutex);
      
      // --- PENGECEKAN KARTU MEMORI LEPAS ---
      if (!sd_write_success) {
        sdFailCount++;
        if (sdFailCount >= 3) {
           Serial.println("!!! FATAL ERROR: Gagal menulis ke SD Card. Memicu Restart...");
           sendSystemError("Memori SD Card tiba-tiba gagal ditulis di tengah operasi!", "Warning");
           delay(3000);
           ESP.restart();
        }
      } else {
        sdFailCount = 0; // Reset hitungan jika normal
      }
      // -------------------------------------
      
    } else {
      Serial.println("  ↳ [PERINGATAN] SD Card sedang sibuk, melewati 1 data ini.");
    }

    // Tunggu sisa waktu agar pas 1 detik
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}

// ==========================================
// TASK 2: WIFI & SINKRONISASI (CORE 0)
// ==========================================
void taskWiFi(void *param) {
  esp_task_wdt_add(NULL);
  
  for (;;) {
    esp_task_wdt_reset(); // Beri makan Watchdog

    // 1. CEK KONEKSI WIFI
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("  ↳ [WIFI] Terputus! Menghubungkan ulang...");
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      uint8_t tries = 0;
      while (WiFi.status() != WL_CONNECTED && tries < 10) {
        vTaskDelay(pdMS_TO_TICKS(500));
        tries++;
      }
      if (WiFi.status() != WL_CONNECTED) {
        vTaskDelay(pdMS_TO_TICKS(2000)); // Coba lagi nanti
        continue; 
      }
      Serial.println("  ↳ [WIFI] Berhasil terhubung ke jaringan!");
    }

    // 2. BACA DATA YANG BELUM TERKIRIM DARI SD CARD (Maksimal 30 baris per paket)
    String payload = "[";
    int lines_read = 0;
    
    if (xSemaphoreTake(sdMutex, pdMS_TO_TICKS(1000)) == pdTRUE) {
      if (SD.exists("/unsynced.csv")) {
        File f = SD.open("/unsynced.csv", FILE_READ);
        if (f) {
          while (f.available() && lines_read < 30) {
            String line = f.readStringUntil('\n');
            line.trim();
            if (line.length() == 0) continue;
            
            // Format line: timestamp,tinggi_air,hujan
            int comma1 = line.indexOf(',');
            int comma2 = line.indexOf(',', comma1 + 1);
            if (comma1 > 0 && comma2 > 0) {
              String ts = line.substring(0, comma1);
              String air = line.substring(comma1 + 1, comma2);
              String hujan = line.substring(comma2 + 1);
              
              if (lines_read > 0) payload += ",";
              payload += "{\"timestamp\":\"" + ts + "\",\"tinggi_air\":" + air + ",\"hujan\":" + hujan + "}";
              lines_read++;
            }
          }
          f.close();
        }
      }
      xSemaphoreGive(sdMutex); // Langsung lepas Mutex agar Sensor Task tidak terganggu
    }

    // 3. KIRIM PAKET KE SERVER (JIKA ADA DATA)
    if (lines_read > 0) {
      payload += "]";
      Serial.printf("  ↳ [SINKRON] Mengirim %d paket data ke server... ", lines_read);
      
      HTTPClient http;
      String finalUrl = String(BACKEND_URL);
      if (!finalUrl.startsWith("http")) finalUrl = "http://" + finalUrl;
      http.begin(finalUrl);
      http.addHeader("Content-Type", "application/json");
      int rc = http.POST(payload);
      http.end();

      if (rc == 200 || rc == 201) {
        Serial.println("OK! (Sukses & dihapus dari antrean)");
        
        // 4. HAPUS BARIS YANG SUDAH TERKIRIM DARI unsynced.csv
        if (xSemaphoreTake(sdMutex, pdMS_TO_TICKS(1000)) == pdTRUE) {
          File orig = SD.open("/unsynced.csv", FILE_READ);
          File tmp = SD.open("/temp.csv", FILE_WRITE);
          if (orig && tmp) {
            int lines_processed_in_orig = 0;
            while (orig.available()) {
              String line = orig.readStringUntil('\n');
              line.trim();
              if (line.length() == 0) continue;
              
              int comma1 = line.indexOf(',');
              int comma2 = line.indexOf(',', comma1 + 1);
              
              if (comma1 > 0 && comma2 > 0) {
                 if (lines_processed_in_orig >= lines_read) {
                   tmp.println(line);
                 }
                 lines_processed_in_orig++;
              } else {
                 // Jika format salah, kita biarkan saja (dihapus/tidak ditulis ke temp)
                 // agar tidak menyumbat antrean.
              }
            }
            orig.close();
            tmp.close();
            SD.remove("/unsynced.csv");
            SD.rename("/temp.csv", "/unsynced.csv");
          }
          xSemaphoreGive(sdMutex);
        }
      } else {
        Serial.printf("GAGAL (HTTP %d). Akan diulang nanti...\n", rc);
        vTaskDelay(pdMS_TO_TICKS(2000)); // Jeda sebelum mengulang pengiriman
      }
    } else {
      // Tidak ada data untuk dikirim, istirahat sejenak
      vTaskDelay(pdMS_TO_TICKS(500)); 
    }
  }
}
