/*
 * LabGate ESP32 Firmware
 * Hardware: ESP32 + MFRC522 RFID + LCD 16x2 I2C + Relay Kunci + Buzzer/LED + Simulasi Tombol Wokwi
 * Protokol: MQTT ke Gateway Lokal (atau HiveMQ untuk simulasi Wokwi)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>

// Konfigurasi WiFi Wokwi
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";

// Konfigurasi MQTT
const char* MQTT_SERVER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char* TOPIC_ROOT = "labgate/lab-01";
const char* ROOM_CODE = "lab-01";

// Pin Perangkat Keras
// CATATAN: I2C LCD menggunakan Pin 21 (SDA) dan Pin 22 (SCL).
// RST_PIN MFRC522 HARUS menggunakan Pin 27 (JANGAN gunakan Pin 22 agar tidak merusak bus I2C LCD).
#define SS_PIN        5
#define RST_PIN       27
#define RELAY_PIN     26
#define BUZZER_PIN    2
#define LED_GREEN     15
#define LED_RED       4

// Objek Perangkat Keras
LiquidCrystal_I2C lcd(0x27, 16, 2);
MFRC522 rfc(SS_PIN, RST_PIN);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// State Machine & Counter
enum DoorState { STATE_IDLE, STATE_WAITING_RESPONSE, STATE_DOOR_OPEN, STATE_DENIED };
DoorState currentState = STATE_IDLE;

unsigned long currentSeq = 0;
unsigned long stateTimer = 0;
unsigned long holdDuration = 5000;
unsigned long lastStatusPublish = 0;

void setLcdIdle() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LabGate: ");
  lcd.print(ROOM_CODE);
  lcd.setCursor(0, 1);
  lcd.print("Tempelkan Kartu");
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, LOW);
  digitalWrite(RELAY_PIN, LOW); // Solenoid terkunci
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  char message[256];
  if (length >= sizeof(message)) length = sizeof(message) - 1;
  memcpy(message, payload, length);
  message[length] = '\0';
  Serial.println("MQTT Diterima: " + String(message));

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, message);
  if (err) {
    Serial.println("Gagal parse JSON MQTT");
    return;
  }

  unsigned long msgSeq = doc["seq"] | 0;
  const char* action = doc["action"] | "";

  // Balasan mencocokkan currentSeq saat menunggu respon, atau remote unlock darurat (seq == 0)
  bool isMatchingSeq = (currentState == STATE_WAITING_RESPONSE && msgSeq == currentSeq);
  bool isRemoteUnlock = (currentState == STATE_IDLE && msgSeq == 0 && strcmp(action, "open") == 0);

  if (isMatchingSeq || isRemoteUnlock) {
    if (strcmp(action, "open") == 0) {
      const char* name = doc["name"] | "Pengguna";
      holdDuration = doc["holdMs"] | 5000;

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("AKSES DITERIMA");
      lcd.setCursor(0, 1);
      char truncatedName[17];
      strncpy(truncatedName, name, 16);
      truncatedName[16] = '\0';
      lcd.print(truncatedName);

      digitalWrite(RELAY_PIN, HIGH); // Buka kunci solenoid
      digitalWrite(LED_GREEN, HIGH);
      digitalWrite(LED_RED, LOW);

      // Buzzer nada sukses (2 beep pendek)
      tone(BUZZER_PIN, 2000, 100);
      delay(150);
      tone(BUZZER_PIN, 2500, 150);

      currentState = STATE_DOOR_OPEN;
      stateTimer = millis();
    } else if (strcmp(action, "deny") == 0) {
      const char* reason = doc["reason"] | "Ditolak";
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("AKSES DITOLAK");
      lcd.setCursor(0, 1);
      char truncatedReason[17];
      strncpy(truncatedReason, reason, 16);
      truncatedReason[16] = '\0';
      lcd.print(truncatedReason);

      digitalWrite(RELAY_PIN, LOW);
      digitalWrite(LED_GREEN, LOW);
      digitalWrite(LED_RED, HIGH);

      // Buzzer nada tolak (1 beep panjang)
      tone(BUZZER_PIN, 800, 600);

      currentState = STATE_DENIED;
      stateTimer = millis();
    }
  }
}

void publishStatus(const char* statusStr) {
  StaticJsonDocument<128> doc;
  doc["room"] = ROOM_CODE;
  doc["status"] = statusStr;
  doc["uptime"] = millis() / 1000;
  char buffer[128];
  serializeJson(doc, buffer);
  String statusTopic = String(TOPIC_ROOT) + "/status";
  mqttClient.publish(statusTopic.c_str(), buffer);
}

void reconnectMqtt() {
  while (!mqttClient.connected()) {
    String clientId = "ESP32Gate-" + String(ROOM_CODE) + "-" + String(random(1000, 9999));
    Serial.print("Mencoba koneksi MQTT ke " + String(MQTT_SERVER) + "...");
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("Berhasil!");
      String cmdTopic = String(TOPIC_ROOT) + "/cmd";
      mqttClient.subscribe(cmdTopic.c_str());
      publishStatus("online");
      setLcdIdle(); // Perbarui LCD seketika setelah MQTT terhubung
    } else {
      Serial.print("Gagal, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" coba lagi dlm 2 detik");
      delay(2000);
    }
  }
}

void setupWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Menghubungkan ke WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi Terhubung! IP: " + WiFi.localIP().toString());
}

void triggerRfidScan(String uidStr) {
  uidStr.toLowerCase();
  Serial.println("\n[SCAN RFID] Memproses UID: " + uidStr);

  currentSeq++;
  StaticJsonDocument<128> doc;
  doc["seq"] = currentSeq;
  doc["room"] = ROOM_CODE;
  doc["method"] = "rfid";
  doc["uid"] = uidStr;

  char buffer[128];
  serializeJson(doc, buffer);
  String scanTopic = String(TOPIC_ROOT) + "/scan";
  mqttClient.publish(scanTopic.c_str(), buffer);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Memverifikasi...");
  lcd.setCursor(0, 1);
  lcd.print("UID: " + uidStr);

  currentState = STATE_WAITING_RESPONSE;
  stateTimer = millis();
}

void checkRfidHardware() {
  // Pembacaan fisik MFRC522 (untuk board fisik nyata & komponen Wokwi board-mfrc522)
  if (rfc.PICC_IsNewCardPresent() && rfc.PICC_ReadCardSerial()) {
    String uidStr = "";
    for (byte i = 0; i < rfc.uid.size; i++) {
      if (rfc.uid.uidByte[i] < 0x10) uidStr += "0";
      uidStr += String(rfc.uid.uidByte[i], HEX);
    }
    uidStr.toLowerCase();
    rfc.PICC_HaltA();
    rfc.PCD_StopCrypto1();
    Serial.println("[WOKWI RFID] Kartu Terdeteksi di Reader: " + uidStr);
    triggerRfidScan(uidStr);
  }
}

void checkSerialInputs() {
  // Input Serial Monitor: Ketik UID atau nama mahasiswa langsung di terminal Wokwi
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.length() > 0) {
      if (input == "isya" || input == "tap" || input == "ktm") {
        triggerRfidScan("01020304");
      } else if (input == "malvin") {
        triggerRfidScan("11223344");
      } else if (input == "bintang") {
        triggerRfidScan("55667788");
      } else {
        triggerRfidScan(input);
      }
    }
  }
}

void setup() {
  Serial.begin(115200);

  // Inisialisasi Pin Output
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, LOW);

  // Inisialisasi Bus I2C LCD (Pin 21 SDA, Pin 22 SCL)
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("LabGate Booting");
  lcd.setCursor(0, 1);
  lcd.print("Menghubungkan...");

  // Inisialisasi SPI RFID (RST menggunakan pin 27, BUKAN 22)
  SPI.begin();
  rfc.PCD_Init();

  setupWiFi();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  reconnectMqtt();
  setLcdIdle();

  Serial.println("\n================================================");
  Serial.println("       LABGATE RFID DOOR ACCESS READY           ");
  Serial.println("================================================");
  Serial.println("Pilihan Kartu Fisik Wokwi (board-mfrc522):");
  Serial.println("  * [b] Blue Card   -> UID 01020304 (Isya - 21120124130051)");
  Serial.println("  * [g] Green Card  -> UID 11223344 (Malvin)");
  Serial.println("  * [y] Yellow Card -> UID 55667788 (Bintang)");
  Serial.println("  * [r] Red Card    -> UID aabbccdd (Kartu Asing / Ditolak)");
  Serial.println("Tekan 't' di keyboard pada Wokwi untuk TAP kartu!\n");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) setupWiFi();
  if (!mqttClient.connected()) reconnectMqtt();
  mqttClient.loop();

  // Heartbeat berkala tiap 30 detik
  if (millis() - lastStatusPublish > 30000) {
    publishStatus("online");
    lastStatusPublish = millis();
  }

  unsigned long now = millis();

  switch (currentState) {
    case STATE_IDLE:
      checkSerialInputs();
      checkRfidHardware();
      break;

    case STATE_WAITING_RESPONSE:
      // Timeout jika gateway tidak merespon dalam 3 detik
      if (now - stateTimer > 3000) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("GATE TIMEOUT");
        lcd.setCursor(0, 1);
        lcd.print("Coba Lagi");
        currentState = STATE_DENIED;
        stateTimer = now;
      }
      break;

    case STATE_DOOR_OPEN:
      if (now - stateTimer >= holdDuration) {
        digitalWrite(RELAY_PIN, LOW); // Kunci pintu kembali
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
