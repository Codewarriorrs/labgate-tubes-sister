/*
 * LabGate ESP32 Firmware (Direct-to-Cloud Mode - Tanpa Gateway Terpisah)
 * Hardware: ESP32 + MFRC522 RFID + Keypad 4x4 + LCD 16x2 I2C + Relay + Buzzer + LED
 * Komunikasi: HTTP/HTTPS langsung ke Cloud Next.js (/api/gate/verify)
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>

// ==========================================
// KONFIGURASI WIFI & CLOUD
// ==========================================
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";

// URL Cloud Production Anda (Vercel)
const char* CLOUD_URL = "https://labgate-tubes-sister.vercel.app";

const char* ROOM_CODE = "lab-01";
const char* EMERGENCY_PIN = "1722";

// Pin Perangkat Keras
// CATATAN: I2C LCD menggunakan Pin 21 (SDA) dan Pin 22 (SCL).
// RST_PIN MFRC522 menggunakan Pin 27 (jangan pakai 22 agar tidak bentrok dengan I2C).
#define SS_PIN        5
#define RST_PIN       27
#define RELAY_PIN     26
#define BUZZER_PIN    2
#define LED_GREEN     15
#define LED_RED       4

// Objek Perangkat Keras
LiquidCrystal_I2C lcd(0x27, 16, 2);
MFRC522 rfc(SS_PIN, RST_PIN);

// Konfigurasi Keypad 4x4 (wokwi-membrane-keypad)
const byte KEYPAD_ROWS = 4;
const byte KEYPAD_COLS = 4;
char hexaKeys[KEYPAD_ROWS][KEYPAD_COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};
byte rowPins[KEYPAD_ROWS] = {32, 33, 25, 14};
byte colPins[KEYPAD_COLS] = {13, 17, 16, 12};
Keypad customKeypad = Keypad(makeKeymap(hexaKeys), rowPins, colPins, KEYPAD_ROWS, KEYPAD_COLS);

// State Machine
enum DoorState { STATE_IDLE, STATE_DOOR_OPEN, STATE_DENIED };
DoorState currentState = STATE_IDLE;

unsigned long stateTimer = 0;
unsigned long holdDuration = 5000;
unsigned long lastPollTime = 0;
unsigned long lastWifiRetryTime = 0;

String pinBuffer = "";
unsigned long lastKeyPressTime = 0;

void setLcdIdle() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LabGate: ");
  lcd.print(ROOM_CODE);
  lcd.setCursor(0, 1);
  lcd.print("Tap KTM / PIN #");

  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, LOW);
}

void openDoor(const char* displayName, unsigned long durationMs) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("AKSES DITERIMA");
  lcd.setCursor(0, 1);
  char truncated[17];
  strncpy(truncated, displayName, 16);
  truncated[16] = '\0';
  lcd.print(truncated);

  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(LED_GREEN, HIGH);
  digitalWrite(LED_RED, LOW);

  tone(BUZZER_PIN, 2000, 150);
  delay(180);
  tone(BUZZER_PIN, 2500, 150);

  holdDuration = durationMs;
  currentState = STATE_DOOR_OPEN;
  stateTimer = millis();
}

void denyDoor(const char* reason) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("AKSES DITOLAK");
  lcd.setCursor(0, 1);
  char truncated[17];
  strncpy(truncated, reason, 16);
  truncated[16] = '\0';
  lcd.print(truncated);

  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, HIGH);
  tone(BUZZER_PIN, 800, 600);

  currentState = STATE_DENIED;
  stateTimer = millis();
}

void setupWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(100);
  // Channel 6 adalah channel default Wokwi-GUEST agar koneksi cepat
  WiFi.begin(WIFI_SSID, WIFI_PASS, 6);
  Serial.print("Menghubungkan ke WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(250);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Terhubung! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[INFO] WiFi belum terhubung, akan mencoba ulang di latar belakang.");
  }
}

void verifyWithCloud(const char* method, String uidStr) {
  uidStr.toLowerCase();
  Serial.println("\n[CLOUD VERIFY] Method=" + String(method) + " UID=" + uidStr);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] WiFi tidak terhubung.");
    denyDoor("WiFi Offline");
    return;
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Cek ke Cloud...");
  lcd.setCursor(0, 1);
  lcd.print("UID: " + uidStr);

  WiFiClientSecure secureClient;
  secureClient.setInsecure(); // Mengizinkan HTTPS ke Vercel / Ngrok tanpa pin sertifikat
  secureClient.setTimeout(15);

  HTTPClient http;
  String endpoint = String(CLOUD_URL) + "/api/gate/verify";
  http.begin(secureClient, endpoint);
  http.useHTTP10(true);
  http.setReuse(false);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000);

  StaticJsonDocument<128> reqDoc;
  reqDoc["room"] = ROOM_CODE;
  reqDoc["method"] = method;
  reqDoc["uid"] = uidStr;

  String reqBody;
  serializeJson(reqDoc, reqBody);

  int httpCode = http.POST(reqBody);
  if (httpCode > 0) {
    String payload = http.getString();
    Serial.println("[CLOUD RESPON] HTTP " + String(httpCode) + ": " + payload);

    StaticJsonDocument<256> resDoc;
    DeserializationError err = deserializeJson(resDoc, payload);
    if (!err) {
      const char* action = resDoc["action"] | "deny";
      if (strcmp(action, "open") == 0) {
        const char* userName = resDoc["name"] | "Mahasiswa";
        unsigned long ms = resDoc["holdMs"] | 5000;
        openDoor(userName, ms);
      } else {
        const char* reason = resDoc["reason"] | "Ditolak Cloud";
        denyDoor(reason);
      }
    } else {
      denyDoor("Respon Invalid");
    }
  } else {
    Serial.println("[CLOUD ERROR] Kode HTTP: " + String(httpCode) + " (" + http.errorToString(httpCode) + ")");
    denyDoor("Cloud Offline");
  }

  http.end();
}

void pollRemoteUnlock() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  secureClient.setTimeout(10);

  HTTPClient http;
  String endpoint = String(CLOUD_URL) + "/api/gate/verify?room=" + String(ROOM_CODE);
  http.useHTTP10(true);
  http.setReuse(false);
  http.begin(secureClient, endpoint);
  http.setTimeout(10000);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<256> resDoc;
    if (!deserializeJson(resDoc, payload)) {
      const char* action = resDoc["action"] | "idle";
      if (strcmp(action, "open") == 0) {
        const char* userName = resDoc["name"] | "Remote Admin";
        unsigned long ms = resDoc["holdMs"] | 5000;
        Serial.println("[REMOTE UNLOCK] Pintu dibuka oleh Admin Cloud!");
        openDoor(userName, ms);
      }
    }
  }
  http.end();
}

void checkKeypadInput() {
  char customKey = customKeypad.getKey();
  if (customKey) {
    lastKeyPressTime = millis();
    tone(BUZZER_PIN, 1500, 40);

    if (customKey == '*') {
      pinBuffer = "";
      setLcdIdle();
      return;
    }

    if (customKey == '#') {
      if (pinBuffer.length() > 0) {
        Serial.println("\n[KEYPAD] PIN dimasukkan: " + pinBuffer);
        if (pinBuffer == EMERGENCY_PIN) {
          Serial.println("[KEYPAD] PIN DARURAT BENAR! Pintu dibuka mandiri.");
          pinBuffer = "";
          openDoor("Petugas Piket", 5000);
        } else {
          Serial.println("[KEYPAD] PIN SALAH!");
          pinBuffer = "";
          denyDoor("PIN Salah");
        }
      }
      return;
    }

    if (pinBuffer.length() < 8) {
      pinBuffer += customKey;
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Masukkan PIN:");
      lcd.setCursor(0, 1);
      String masked = "";
      for (int i = 0; i < pinBuffer.length(); i++) masked += "*";
      lcd.print(masked + " (# Ok)");
    }
  }

  // Timeout jika mengetik PIN tidak selesai selama 10 detik
  if (pinBuffer.length() > 0 && (millis() - lastKeyPressTime > 10000)) {
    pinBuffer = "";
    setLcdIdle();
  }
}

void checkRfidHardware() {
  if (rfc.PICC_IsNewCardPresent() && rfc.PICC_ReadCardSerial()) {
    String uidStr = "";
    for (byte i = 0; i < rfc.uid.size; i++) {
      if (rfc.uid.uidByte[i] < 0x10) uidStr += "0";
      uidStr += String(rfc.uid.uidByte[i], HEX);
    }
    uidStr.toLowerCase();
    rfc.PICC_HaltA();
    rfc.PCD_StopCrypto1();
    Serial.println("[WOKWI RFID] Kartu Terdeteksi: " + uidStr);
    verifyWithCloud("rfid", uidStr);
  }
}

void checkSerialInputs() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.length() > 0) {
      if (input == "isya" || input == "tap" || input == "ktm") {
        verifyWithCloud("rfid", "01020304");
      } else if (input == "malvin") {
        verifyWithCloud("rfid", "11223344");
      } else if (input == "bintang") {
        verifyWithCloud("rfid", "55667788");
      } else {
        verifyWithCloud("rfid", input);
      }
    }
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, LOW);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("LabGate Booting");
  lcd.setCursor(0, 1);
  lcd.print("Menghubungkan...");

  SPI.begin();
  rfc.PCD_Init();

  setupWiFi();
  setLcdIdle();

  Serial.println("\n================================================");
  Serial.println("    LABGATE DIRECT CLOUD DOOR ACCESS READY      ");
  Serial.println("================================================");
  Serial.println("Cloud API: " + String(CLOUD_URL) + "/api/gate/verify");
  Serial.println("Keypad 4x4 Darurat: Ketik 1722# (langsung buka pintu)");
  Serial.println("Serial / RFID Test: isya (01020304), malvin (11223344), bintang (55667788)\n");
}

void loop() {
  unsigned long now = millis();

  // Auto-reconnect WiFi di latar belakang jika sempat terputus / lambat saat boot
  if (WiFi.status() != WL_CONNECTED && (now - lastWifiRetryTime > 10000)) {
    lastWifiRetryTime = now;
    Serial.println("[WIFI] Mencoba menghubungkan ulang ke Wokwi-GUEST...");
    WiFi.begin(WIFI_SSID, WIFI_PASS, 6);
  }

  switch (currentState) {
    case STATE_IDLE:
      checkKeypadInput();
      checkSerialInputs();
      checkRfidHardware();

      // Polling perintah Remote Unlock dari Cloud tiap 15 detik (saat tidak sedang mengetik PIN)
      if (pinBuffer.length() == 0 && (now - lastPollTime > 15000)) {
        lastPollTime = now;
        pollRemoteUnlock();
      }
      break;

    case STATE_DOOR_OPEN:
      if (now - stateTimer >= holdDuration) {
        digitalWrite(RELAY_PIN, LOW);
        setLcdIdle();
        currentState = STATE_IDLE;
      }
      break;

    case STATE_DENIED:
      if (now - stateTimer >= 2500) {
        setLcdIdle();
        currentState = STATE_IDLE;
      }
      break;
  }

  delay(20);
}

