# Desain Arsitektur dan Diagram Sistem LabGate (docs/ARSITEKTUR.md)

Dokumen ini menyajikan arsitektur lengkap sistem terintegrasi **LabGate**, mencakup diagram konteks, diagram komponen, entity-relationship diagram (ERD), skema SQLite lokal, diagram sekuensial alur bisnis, serta arsitektur deployment.

---

## 1. Diagram Konteks / Arsitektur Sistem

Sistem terdiri dari **DUA Service mandiri** yang berkomunikasi murni melalui protokol HTTP REST, serta **satu perangkat periferal IoT fisik/simulasi (ESP32)** yang berbicara ke Gateway lokal menggunakan protokol MQTT.

> **PENEGASAN ARSITEKTUR**: ESP32 **BUKAN** merupakan service independen, melainkan periferal mikrokontroler penggerak relay solenoid pintu dan pembaca sensor RFID. Dua service yang dinilai dalam tugas adalah **Service 1 (Cloud)** dan **Service 2 (Gateway Lokal)**.

```mermaid
flowchart TB
    subgraph PENGGUNA["Pengguna Sistem"]
        MHS["Mahasiswa (Laptop/Smartphone)"]
        DOSEN["Dosen Pembimbing & Admin Lab"]
    end

    subgraph CLOUD_ENV["Platform Cloud (Vercel)"]
        S1["SERVICE 1: Web Booking & Approval (Next.js 14)\nREST API Server"]
        DB_CLOUD[("Database Relasional\nPostgreSQL (Neon)")]
        S1 <--> DB_CLOUD
    end

    subgraph LOCAL_GATE["Perangkat Depan Pintu Lab (Mini PC / Laptop Kiosk)"]
        S2["SERVICE 2: Edge Gateway & Kiosk UI (Port 4000)\nREST API Client & Server"]
        DB_LOCAL[("Offline Cache & Outbox\nSQLite (better-sqlite3)")]
        S2 <--> DB_LOCAL
    end

    subgraph PERIFERAL_PINTU["Pintu Fisik Laboratorium"]
        ESP["Perangkat Mikrokontroler (ESP32)\nRFID RC522 + LCD 16x2 + Relay Solenoid"]
        BROKER["MQTT Broker\n(Local Mosquitto / HiveMQ Wokwi)"]
        ESP <-->|Protokol MQTT| BROKER
        BROKER <-->|Protokol MQTT| S2
    end

    MHS -->|HTTP REST (Browser)| S1
    DOSEN -->|HTTP REST (Browser)| S1
    S2 <==>|HTTP REST Inter-Service (GET, POST, PUT, DELETE)| S1
    MHS -.->|Scan Tiket QR Kamera| S2
    MHS -.->|Tap Fisik KTM RFID| ESP

    classDef serviceNode fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#ffffff;
    classDef edgeNode fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#ffffff;
    classDef deviceNode fill:#334155,stroke:#f59e0b,stroke-width:2px,color:#ffffff;
    class S1 serviceNode;
    class S2 edgeNode;
    class ESP,BROKER deviceNode;
```

---

## 2. Diagram Komponen Service

### 2.1. Komponen Service 1: Cloud (`apps/cloud`)
```mermaid
flowchart LR
    subgraph CLOUD_APP["apps/cloud (Next.js App Router)"]
        direction TB
        AUTH_MOD["Auth & JWT Module\n(lib/auth.ts)"]
        CRYPTO_MOD["Kriptografi Ed25519 & Pepper\n(lib/crypto.ts)"]
        CONFLICT_MOD["Mesin Cek Bentrok\n(lib/db.ts)"]
        GW_AUTH["Gateway Bearer Auth\n(lib/gatewayAuth.ts)"]
        
        API_USER["User REST Endpoints\n(/api/auth, /api/bookings, /api/rooms, /api/cards)"]
        API_GW["Gateway REST Endpoints\n(/api/gateway/snapshot, /logs, /heartbeat, /commands)"]
        
        UI_VIEWS["Web Views (Mobile-First)\n(/login, /dashboard, /approval, /rooms, /logs, /api-docs)"]
    end

    POSTGRES[("PostgreSQL\nExclusion Constraint")]
    
    API_USER --> CONFLICT_MOD
    API_USER --> AUTH_MOD
    API_GW --> GW_AUTH
    API_GW --> CRYPTO_MOD
    CONFLICT_MOD --> POSTGRES
    API_GW --> POSTGRES
```

### 2.2. Komponen Service 2: Gateway Lokal (`apps/gateway`)
```mermaid
flowchart LR
    subgraph GATEWAY_APP["apps/gateway (Node.js & Express)"]
        direction TB
        DECISION["Mesin Keputusan Murni\n(src/decisionEngine.ts)"]
        SQLITE_REPO["SQLite Cache & Outbox Repo\n(src/sqliteDb.ts)"]
        CLOUD_CLIENT["Klien HTTP REST Cloud\n(src/cloudClient.ts)"]
        MQTT_HANDLER["Handler MQTT ESP32\n(src/mqttHandler.ts)"]
        KIOSK_SERVER["Server Web Kiosk & REST\n(src/kioskServer.ts:4000)"]
    end

    SQLITE_LOCAL[("SQLite Database\n(data/gateway.db)")]

    MQTT_HANDLER -->|Event Scan| DECISION
    KIOSK_SERVER -->|Scan QR / PIN| DECISION
    DECISION -->|Baca Cache Booking| SQLITE_REPO
    DECISION -->|Enqueue Outbox| SQLITE_REPO
    SQLITE_REPO <--> SQLITE_LOCAL
    CLOUD_CLIENT <-->|Snapshot & Flush Outbox| SQLITE_REPO
```

---

## 3. Entity-Relationship Diagram (ERD) & Skema Data

### 3.1. ERD Cloud (PostgreSQL)
```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : "mengajukan"
    USERS ||--o{ CARDS : "memiliki"
    ROOMS ||--o{ BOOKINGS : "dijadwalkan di"
    ROOMS ||--o{ EQUIPMENT : "menyediakan"
    ROOMS ||--o{ ACCESS_LOGS : "mencatat di"
    ROOMS ||--o{ GATEWAY_COMMANDS : "menerima perintah"
    EQUIPMENT ||--o? BOOKINGS : "dipinjam pada"

    USERS {
        varchar id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role
        varchar department
        varchar nim
        timestamptz created_at
    }

    ROOMS {
        varchar id PK
        varchar code UK
        varchar name
        int capacity
        varchar api_key_hash UK
        boolean is_active
        timestamptz last_seen
        timestamptz last_sync
        varchar version
        int queue_count
    }

    CARDS {
        varchar id PK
        varchar user_id FK
        varchar uid_hash UK
        varchar label
        boolean is_active
        timestamptz created_at
    }

    EQUIPMENT {
        varchar id PK
        varchar room_id FK
        varchar name
        varchar code UK
        boolean is_available
    }

    BOOKINGS {
        varchar id PK
        varchar user_id FK
        varchar room_id FK
        varchar equipment_id FK
        text purpose
        timestamptz start_time
        timestamptz end_time
        varchar status
        text rejection_reason
        text qr_token
    }

    ACCESS_LOGS {
        varchar id PK
        varchar event_id UK
        varchar room_id FK
        varchar user_id FK
        varchar method
        varchar identifier
        varchar result
        varchar reason
        varchar user_name
        timestamptz timestamp
    }

    GATEWAY_COMMANDS {
        varchar id PK
        varchar room_id FK
        varchar action
        jsonb payload
        varchar status
        timestamptz expires_at
        timestamptz created_at
    }
```

### 3.2. Skema SQLite Gateway Lokal (`better-sqlite3`)
```mermaid
erDiagram
    CACHE_METADATA {
        text key PK
        text value
        text updated_at
    }

    CACHED_BOOKINGS {
        text id PK
        text user_id
        text user_name
        text room_code
        text start_time
        text end_time
        text status
        text card_uid_hashes
        text updated_at
    }

    OUTBOX_LOGS {
        text event_id PK
        text room_code
        text method
        text identifier
        text result
        text reason
        text user_name
        text timestamp
        integer sent
        text created_at
    }
```

---

## 4. Diagram Sekuensial Alur Operasional

### 4.1. Alur Pengajuan Booking, Approval Dosen, dan Sinkronisasi Gateway
```mermaid
sequenceDiagram
    autonumber
    actor M as Mahasiswa
    actor D as Dosen / Admin
    participant C as Service 1 (Cloud)
    participant G as Service 2 (Gateway)

    M->>C: POST /api/bookings (Ajukan booking: ruangan, jam, keperluan)
    C->>C: Validasi tstzrange (Cegah bentrok jadwal)
    C-->>M: Status 'menunggu' tersimpan

    D->>C: GET /api/bookings (Lihat antrean approval)
    D->>C: PUT /api/bookings/{id}/decision (Setujui booking)
    C->>C: Terbitkan Tiket QR Ed25519 (signQrTicket)
    C-->>D: Status 'disetujui' & QR diterbitkan

    Note over G,C: Siklus Sinkronisasi Terjadwal (Tiap 60 Detik)
    G->>C: GET /api/gateway/snapshot (Bearer API Key)
    C-->>G: 200 OK (Public Key, Booking Disetujui, Hash UID)
    G->>G: Simpan ke SQLite lokal (cached_bookings & metadata)
```

### 4.2. Alur Tap Kartu RFID Saat Online
```mermaid
sequenceDiagram
    autonumber
    actor M as Mahasiswa
    participant E as ESP32 (Pintu)
    participant G as Service 2 (Gateway)
    participant C as Service 1 (Cloud)

    M->>E: Tempelkan Kartu KTM (UID: 01020304)
    E->>G: MQTT Publish <TOPIC_ROOT>/scan {seq: 1, uid: "01020304"}
    G->>G: evaluateAccess('rfid') -> Cocokkan hash UID di SQLite lokal
    G->>G: Validasi jam: [mulai - 10m, selesai + 5m]
    G-->>E: MQTT Publish <TOPIC_ROOT>/cmd {seq: 1, action: "open", name: "Isya", holdMs: 5000}
    E->>E: Relay Aktif 5 Detik & LCD "AKSES DITERIMA: Isya"
    G->>G: Simpan log ke outbox SQLite (sent = 0)
    G->>C: POST /api/gateway/logs (Kirim batch outbox)
    C-->>G: 200 OK (acceptedEventIds)
    G->>G: Update outbox lokal (sent = 1)
```

### 4.3. Alur Tap Kartu Saat Internet Kampus Mati (Offline Resilience)
```mermaid
sequenceDiagram
    autonumber
    actor M as Mahasiswa
    participant E as ESP32 (Pintu)
    participant G as Service 2 (Gateway Lokal)
    participant C as Service 1 (Cloud)

    Note over G,C: INTERNET KAMPUS MATI TOTAL (Koneksi ke Cloud Terputus)
    M->>E: Tempelkan Kartu KTM (UID: 01020304)
    E->>G: MQTT Publish <TOPIC_ROOT>/scan {seq: 2, uid: "01020304"}
    G->>G: evaluateAccess() membaca CACHE SQLITE lokal
    Note over G: Booking & hash UID valid ditemukan di cache!
    G-->>E: MQTT Publish <TOPIC_ROOT>/cmd {seq: 2, action: "open", name: "Isya", holdMs: 5000}
    E->>E: Pintu TERBUKA 5 Detik! (LCD: "AKSES DITERIMA")
    G->>G: Simpan log ke outbox SQLite (sent = 0)

    Note over G,C: INTERNET KAMPUS KEMBALI PULIH
    G->>C: POST /api/gateway/logs (Flush outbox tertunda)
    C-->>G: 200 OK (Idempoten: tidak ada data duplikat)
    G->>G: Tandai outbox terkirim (sent = 1)
```

### 4.4. Alur Buka Pintu Jarak Jauh (Remote Unlock via Commands)
```mermaid
sequenceDiagram
    autonumber
    actor D as Dosen / Admin
    participant C as Service 1 (Cloud)
    participant G as Service 2 (Gateway)
    participant E as ESP32 (Pintu)

    D->>C: POST /api/rooms/lab-01/remote-unlock
    C->>C: Simpan ke gateway_commands (action: remote_unlock, expires: 60s)
    C-->>D: Perintah dimasukkan ke antrean

    G->>C: GET /api/gateway/commands (Polling antrean)
    C-->>G: 200 OK (Daftar perintah aktif)
    G->>E: MQTT Publish <TOPIC_ROOT>/cmd {seq: 0, action: "open", name: "Remote Dosen"}
    Note over E: Firmware menerima seq=0 saat IDLE -> Buka relay pintu!
    E->>E: Relay Aktif & LCD "AKSES DITERIMA: Remote Dosen"
    G->>C: DELETE /api/gateway/commands/{id} (Konfirmasi eksekusi)
    C-->>G: 200 OK (Perintah dihapus dari antrean cloud)
```

---

## 5. Diagram Deployment

```mermaid
flowchart TD
    subgraph CLOUD_INFRA["Infrastruktur Cloud (Production)"]
        VERCEL["Vercel Serverless Hosting\n- Service 1: Next.js 14 App Router\n- Domain Publik (HTTPS)\n- REST API Endpoint & Swagger UI (/api-docs)"]
        NEON_PG[("Neon Serverless PostgreSQL\n- Basis Data Relasional\n- Exclusion Constraint (tstzrange)\n- Backup Otomatis & SSL Connection")]
        VERCEL <-->|DATABASE_URL (SSL)| NEON_PG
    end

    subgraph LOCAL_INFRA["Infrastruktur Lokal (Gedung Lab Kampus)"]
        MINI_PC["Mini PC / Laptop Gate Scanner\n- Service 2: Node.js/TypeScript (Port 4000)\n- Layar Kiosk & Webcam QR Scanner (Browser)\n- SQLite Local Database (data/gateway.db)"]
        MQTT_BROKER["MQTT Broker\n(Mosquitto Lokal Port 1883 / HiveMQ)"]
        ESP32_DEVICE["ESP32 Microcontroller\n- Sensor RFID-RC522 (SPI)\n- LCD Display 16x2 (I2C)\n- Relay Solenoid Kunci Pintu (GPIO 26)"]
        
        MINI_PC <-->|TCP Port 1883| MQTT_BROKER
        ESP32_DEVICE <-->|WiFi 802.11 b/g/n| MQTT_BROKER
    end

    MINI_PC <==>|HTTP/HTTPS REST (Bearer API Key)| VERCEL
```
