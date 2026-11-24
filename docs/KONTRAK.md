# Kontrak Antarmuka Komunikasi Sistem LabGate (docs/KONTRAK.md)

Dokumen ini mendefinisikan spesifikasi kontrak antarmuka komunikasi:
1. **MQTT Contract**: Antara Perangkat Fisik (ESP32) dan Service 2 (Gateway Lokal)
2. **HTTP REST Contract**: Antara Service 2 (Gateway Lokal) dan Service 1 (Cloud)

---

## 1. Kontrak Protokol MQTT (ESP32 <-> Gateway Lokal)

*Catatan: ESP32 adalah perangkat periferal IoT, bukan service. Komunikasi ESP32 menggunakan protokol MQTT melalui Broker lokal (Mosquitto) atau Broker HiveMQ (`broker.hivemq.com:1883`) untuk simulasi Wokwi.*

### Format Topik
- Root Topic: `<TOPIC_ROOT>` (default: `labgate/<room_code>`, misal `labgate/lab-01`)
- Topik Scan (ESP32 -> Gateway): `<TOPIC_ROOT>/scan`
- Topik Status (ESP32 -> Gateway): `<TOPIC_ROOT>/status`
- Topik Perintah (Gateway -> ESP32): `<TOPIC_ROOT>/cmd`

### 1.1. Pesan Scan (`<TOPIC_ROOT>/scan`)
Dipublikasikan oleh ESP32 ketika kartu RFID terdeteksi:
```json
{
  "seq": 1,
  "room": "lab-01",
  "method": "rfid",
  "uid": "01020304"
}
```
- `seq` (integer, unsigned): nomor urut transaksi dari ESP32.
- `room` (string): kode ruangan tempat perangkat gate terpasang.
- `method` (string): metode identifikasi (selalu `"rfid"` dari ESP32).
- `uid` (string): UID kartu RFID dalam format lowercase hex tanpa spasi.

### 1.2. Pesan Perintah & Balasan (`<TOPIC_ROOT>/cmd`)
Dipublikasikan oleh Gateway sebagai respon terhadap scan:
- **Akses Diterima (Buka Pintu)**:
  ```json
  {
    "seq": 1,
    "action": "open",
    "name": "Isya Asyhari",
    "holdMs": 5000
  }
  ```
- **Akses Ditolak**:
  ```json
  {
    "seq": 1,
    "action": "deny",
    "reason": "Di luar jadwal"
  }
  ```
- **Aturan Baku**:
  1. Balasan WAJIB membawa nomor `seq` yang identik dengan pesan scan.
  2. `name` dan `reason` maksimal 16 karakter (menyesuaikan limit baris LCD 16x2).
  3. `holdMs` bernilai durasi relay membuka dalam milidetik (default 5000ms = 5 detik).

### 1.3. Perubahan Kontrak: Fitur Remote Unlock (Buka Pintu Jarak Jauh)
Sesuai kebutuhan fitur admin "Buka pintu jarak jauh" dari Cloud:
- Gateway mengirimkan pesan `cmd` ke ESP32 saat state `IDLE`:
  ```json
  {
    "seq": 0,
    "action": "open",
    "name": "Remote Dosen",
    "holdMs": 5000
  }
  ```
- **Spesifikasi Perubahan Firmware ESP32**:
  Firmware mengizinkan eksekusi `action: "open"` apabila `seq == 0` dan kondisi mikrokontroler sedang dalam state `IDLE`. Hal ini memungkinkan pintu dibuka tanpa menunggu event scan fisik terlebih dahulu.

---

## 2. Kontrak HTTP REST Inter-Service (Service 2 Gateway <-> Service 1 Cloud)

Komunikasi antar-service HANYA menggunakan protokol **HTTP REST** dengan empat metode (`GET`, `POST`, `PUT`, `DELETE`). Gateway bertindak sebagai klien (consumer) dan Cloud bertindak sebagai server (provider).

### Skema Autentikasi
Setiap permintaan dari Gateway ke Cloud wajib menyertakan header:
```http
Authorization: Bearer <GATEWAY_API_KEY>
```
Cloud memverifikasi kunci dengan membandingkan hash SHA-256 kunci tersebut yang tersimpan di database Cloud.

---

### 2.1. GET `/api/gateway/snapshot` (Sinkronisasi Offline Cache)
Mengambil kunci publik verifikasi tiket QR, daftar booking yang disetujui untuk ruangan tersebut (hari ini dan besok), serta hash kartu terdaftar.
- **Query Parameter**:
  - `?since=<ISO_TIMESTAMP>` (opsional): Untuk pembaruan inkremental, hanya mengirimkan perubahan/pembatalan sejak waktu tersebut.
- **Respon Sukses (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "serverTime": "2026-11-24T18:00:00.000Z",
      "publicKey": "...",
      "roomCode": "lab-01",
      "bookings": [
        {
          "id": "bkg_01h8",
          "userId": "usr_01",
          "userName": "Isya Asyhari",
          "cardUidHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "startTime": "2026-11-24T13:00:00.000Z",
          "endTime": "2026-11-24T15:00:00.000Z",
          "status": "disetujui"
        }
      ],
      "revokedBookingIds": []
    },
    "message": "Snapshot berhasil diambil"
  }
  ```

---

### 2.2. POST `/api/gateway/logs` (Pengiriman Antrean Log Akses Berkelompok)
Mengirimkan riwayat akses dari antrean lokal (outbox SQLite) ke Cloud secara idempoten.
- **Request Body**:
  ```json
  {
    "logs": [
      {
        "eventId": "c8d0e53a-4467-4a0b-99f2-1a2b3c4d5e6f",
        "roomCode": "lab-01",
        "method": "rfid",
        "identifier": "01020304",
        "result": "granted",
        "reason": null,
        "userName": "Isya Asyhari",
        "timestamp": "2026-11-24T13:05:12.000Z"
      }
    ]
  }
  ```
- **Respon Sukses (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "processed": 1,
      "acceptedEventIds": ["c8d0e53a-4467-4a0b-99f2-1a2b3c4d5e6f"]
    },
    "message": "Log akses berhasil diproses"
  }
  ```
- **Idempotensi**: Jika Cloud menerima `eventId` yang sudah pernah tersimpan, Cloud tetap merespon sukses tanpa menduplikasi baris di tabel database.

---

### 2.3. PUT `/api/gateway/heartbeat` (Status Online & Diagnostik)
Memperbarui status Gateway di Cloud (heartbeat) untuk pemantauan indikator online/offline dan antrean data.
- **Request Body**:
  ```json
  {
    "roomCode": "lab-01",
    "version": "1.0.0",
    "queueCount": 0,
    "lastSync": "2026-11-24T18:00:00.000Z"
  }
  ```
- **Respon Sukses (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "status": "online",
      "lastSeen": "2026-11-24T18:01:00.000Z"
    },
    "message": "Heartbeat berhasil diperbarui"
  }
  ```

---

### 2.4. GET `/api/gateway/commands` (Antrean Perintah Admin)
Mengambil daftar perintah aktif yang diinstruksikan oleh admin dari Cloud (misal: buka pintu jarak jauh, sinkronisasi paksa).
- **Respon Sukses (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "commands": [
        {
          "id": "cmd_8829",
          "action": "remote_unlock",
          "payload": { "holdMs": 5000, "operatorName": "Dr. Bambang" },
          "createdAt": "2026-11-24T18:01:20.000Z",
          "expiresAt": "2026-11-24T18:02:20.000Z"
        }
      ]
    },
    "message": "Daftar perintah berhasil diambil"
  }
  ```

---

### 2.5. DELETE `/api/gateway/commands/{id}` (Konfirmasi Eksekusi Perintah)
Gateway mengonfirmasi bahwa perintah dengan `id` tertentu telah sukses dijalankan, sehingga Cloud menghapusnya dari antrean.
- **Respon Sukses (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": { "id": "cmd_8829", "deleted": true },
    "message": "Perintah berhasil dikonfirmasi dan dihapus dari antrean"
  }
  ```

---

## 3. Emergency PIN Override di Kiosk Lokal
- **Kode PIN Petugas**: `1722` (dikonfigurasi melalui environment variable `EMERGENCY_PIN=1722`).
- Akses manual tercatat ke log SQLite lokal dengan metode `manual_pin` dan dikirimkan ke cloud saat sinkronisasi log berikutnya.
