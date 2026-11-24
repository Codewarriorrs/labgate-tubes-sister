# Laporan Proyek Sistem Terintegrasi: LabGate (docs/LAPORAN.md)

**Judul Proyek**: LabGate - Sistem Terintegrasi Akses Pintu Laboratorium dengan Booking Terjadwal, Approval Bertingkat, dan Edge Gateway Offline-Resilient  
**Mata Kuliah**: Sistem Terintegrasi (Semester 5)  
**Mahasiswa**: Muhammad Isya Asyhari (NIM: 21120124130051)  
**Departemen**: Teknik Komputer, Fakultas Teknik, Universitas Diponegoro (Kampus Tembalang, Semarang)  

---

## DAFTAR ISI LAPORAN (SESUAI RUBRIK PENILAIAN)
1. **Bagian 1 (B1)**: Desain Arsitektur dan Diagram Sistem
2. **Bagian 2 (B2)**: Implementasi Dua Service dan Komunikasi API (GET, POST, PUT, DELETE)
3. **Bagian 3 (B3)**: Deployment Cloud (Vercel & PostgreSQL) dan Langkah Konfigurasi
4. **Bagian 4 (B4)**: Dokumentasi API (OpenAPI 3.0 & Koleksi Postman)
5. **Daftar Tindakan & Bukti Manual yang Harus Diambil Mahasiswa**

---

## 1. BAGIAN 1 (B1): DESAIN ARSITEKTUR DAN DIAGRAM SISTEM

### 1.1. Deskripsi Permasalahan & Solusi Arsitektur
Laboratorium kampus sering mengalami kendala akses: mahasiswa tidak dapat menggunakan lab karena bentrok jadwal yang belum disetujui dosen, atau pintu lab terkunci saat internet kampus terputus sehingga mahasiswa yang sah tidak dapat masuk.

**LabGate** memecahkan masalah ini dengan pendekatan arsitektur terdistribusi yang membagi beban menjadi **DUA Service mandiri** dan **satu perangkat periferal IoT**:
1. **Service 1 (Cloud - `apps/cloud`)**: Berjalan di platform cloud publik (Vercel). Bertanggung jawab atas autentikasi pengguna kampus, manajemen inventaris lab, pencegahan booking bentrok di sisi database PostgreSQL (exclusion constraint), penerbitan tiket QR bertanda tangan kriptografis Ed25519, antrean approval dosen, dan audit trail terpusat.
2. **Service 2 (Edge Gateway Lokal - `apps/gateway`)**: Berjalan lokal di mini PC atau laptop gate scanner di samping pintu lab (Port `4000`). Menggunakan basis data lokal SQLite (`better-sqlite3`) untuk meng-cache daftar booking disetujui (hari ini dan besok), kunci publik Ed25519, serta antrean log lokal (outbox). Gateway mengeksekusi mesin keputusan akses secara mandiri tanpa ketergantungan koneksi internet langsung.
3. **Perangkat Periferal Pintu (ESP32 / Wokwi)**: Mikrokontroler pembaca kartu RFID (MFRC522), layar display LCD 16x2 I2C, dan pengendali relay solenoid kunci pintu fisik. ESP32 terhubung ke Gateway lokal melalui protokol **MQTT**.

> **Penegasan Penilaian**: ESP32 adalah *hardware peripheral* yang berkomunikasi menggunakan MQTT. Dua service yang dinilai dalam tugas adalah Service 1 dan Service 2, dan keduanya berkomunikasi **HANYA menggunakan protokol HTTP REST**.

### 1.2. Diagram Sistem
Diagram sistem dapat dilihat pada `docs/ARSITEKTUR.md` dan berkas SVG pendukung di `docs/diagram/`:
- **Diagram Konteks Sistem**: `docs/diagram/1-konteks-sistem.svg`
- **Diagram Deployment**: `docs/diagram/5-deployment-diagram.svg`

---

## 2. BAGIAN 2 (B2): IMPLEMENTASI DUA SERVICE DAN KOMUNIKASI API

### 2.1. Tabel Endpoint Komunikasi Antar-Service (HTTP REST)
Sesuai Ketentuan Tugas **A1**, keempat metode HTTP (`GET`, `POST`, `PUT`, `DELETE`) digunakan secara bermakna pada komunikasi antar-service dari Gateway (klien) ke Cloud (server):

| Metode HTTP | Endpoint Antar-Service | Header Autentikasi | Fungsi Teknis & Makna Operasi | Implementasi Kode Nyata |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/gateway/snapshot` | `Bearer <API_KEY>` | Mengambil public key Ed25519 dan snapshot booking yang disetujui untuk ruangan tersebut (hari ini & besok) beserta hash UID kartu. Mendukung parameter inkremental `?since=` | `apps/cloud/app/api/gateway/snapshot/route.ts` & `apps/gateway/src/cloudClient.ts` |
| **POST** | `/api/gateway/logs` | `Bearer <API_KEY>` | Mengirimkan antrean log akses pintu (outbox) secara berkelompok. Tiap event memiliki UUID `eventId` dan server bersifat **idempoten** | `apps/cloud/app/api/gateway/logs/route.ts` & `apps/gateway/src/cloudClient.ts` |
| **PUT** | `/api/gateway/heartbeat` | `Bearer <API_KEY>` | Memperbarui detak jantung, versi software, jumlah antrean outbox, dan waktu sinkron terakhir di server Cloud | `apps/cloud/app/api/gateway/heartbeat/route.ts` & `apps/gateway/src/cloudClient.ts` |
| **GET** | `/api/gateway/commands` | `Bearer <API_KEY>` | Mengambil antrean perintah aktif dari dosen/admin (misal: Buka Pintu Jarak Jauh / `remote_unlock`) | `apps/cloud/app/api/gateway/commands/route.ts` & `apps/gateway/src/cloudClient.ts` |
| **DELETE** | `/api/gateway/commands/{id}` | `Bearer <API_KEY>` | Gateway mengonfirmasi bahwa perintah telah sukses dieksekusi fisik ke pintu, sehingga Cloud menghapusnya dari antrean | `apps/cloud/app/api/gateway/commands/[id]/route.ts` & `apps/gateway/src/cloudClient.ts` |

### 2.2. Mesin Keputusan Akses (Pure Function Decision Engine)
Logika evaluasi hak akses diimplementasikan sebagai fungsi murni pada `apps/gateway/src/decisionEngine.ts`. Aturan keputusan:
1. **Pemeriksaan Kesegaran Cache**: Jika usia cache terakhir melebihi 24 jam (`maxCacheAgeHours`), gateway mengembalikan kode penolakan `CACHE_KEDALUWARSA`.
2. **KTM RFID**:
   - Hash UID yang ditempel menggunakan SHA-256 dan pepper rahasia.
   - Jika hash kartu tidak terdaftar pada peminjaman di cache -> `KARTU_TIDAK_DIKENAL`.
   - Jika kartu terdaftar namun tidak ada jadwal booking disetujui untuk ruangan tersebut -> `TIDAK_ADA_BOOKING`.
   - Jika jadwal peminjaman ditemukan, sistem mengevaluasi jendela toleransi waktu:
     $$\text{Waktu Masuk Valid} \in [\text{Waktu Mulai} - 10\text{ menit},\, \text{Waktu Selesai} + 5\text{ menit}]$$
   - Jika waktu saat ini berada di luar rentang tersebut -> `DI_LUAR_JADWAL`.
   - Jika memenuhi syarat -> `AKSES_DITERIMA` (`action: "open"`, `holdMs: 5000`, nama dipotong maksimal 16 karakter untuk LCD).
3. **Tiket QR Kamera**:
   - Token divalidasi tanda tangannya menggunakan kunci publik Ed25519 offline yang tersimpan di SQLite lokal.
   - Dicocokkan kode ruangan dan jendela waktu toleransi.
4. **Emergency PIN**:
   - Petugas memasukkan PIN `1722` langsung pada layar Kiosk (`apps/gateway/src/kioskServer.ts`).
   - Pintu langsung terbuka darurat dan tercatat pada outbox log dengan method `manual_pin`.

### 2.3. Penanganan Mode Offline & Pemulihan Jaringan (Resilience)
- **Saat Internet Kampus Terputus**: Gateway mendeteksi kegagalan koneksi ke cloud, mengalihkan status ke `Offline (Cache Aktif)` di layar Kiosk, dan melayani pemindaian kartu/QR secara instan menggunakan data `cached_bookings` di SQLite lokal.
- **Pencatatan Outbox Mandiri**: Setiap akses masuk (sukses maupun ditolak) disimpan ke tabel `outbox_logs` dengan status `sent = 0`.
- **Pemulihan Otomatis**: Saat internet kembali menyala, siklus worker (`runSyncCycle()`) mengirimkan seluruh log tertunda ke endpoint `POST /api/gateway/logs`. Cloud menjamin idempotensi melalui constraint unik pada `event_id`, sehingga tidak pernah terjadi data duplikat di Cloud.

---

## 3. BAGIAN 3 (B3): DEPLOYMENT CLOUD (VERCEL & POSTGRESQL)

### 3.1. Konfigurasi Platform Hosting Cloud
Service 1 (Cloud) dikembangkan menggunakan framework Next.js 14 App Router yang dioptimalkan untuk deployment tanpa konfigurasi (*zero-config*) pada platform **Vercel**, dengan penyimpanan basis data relasional pada **Neon Serverless PostgreSQL**.

### 3.2. Daftar Environment Variables yang Wajib Diisi di Vercel Dashboard
Saat melakukan deployment Service Cloud ke Vercel, variabel lingkungan berikut harus dikonfigurasi pada menu **Settings > Environment Variables**:

| Nama Environment Variable | Deskripsi Nilai | Contoh Nilai |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection string PostgreSQL (Neon/Supabase) berprotokol SSL | `postgresql://user:pass@ep-cool-lab-1234.us-east-2.aws.neon.tech/labgate?sslmode=require` |
| `JWT_SECRET` | Kunci rahasia minimal 32 karakter untuk penandatanganan cookie JWT | `labgate-undip-tembalang-semarang-secret-jwt-key-2026-min32` |
| `CARD_PEPPER` | String salt/pepper rahasia untuk hashing UID kartu RFID (SHA-256) | `labgate_undip_tembalang_secure_pepper_2026` |
| `NODE_ENV` | Mode lingkungan aplikasi | `production` |

### 3.3. Skrip Pemeriksaan Otomatis (`scripts/verify-deploy.ts`)
Telah disediakan skrip pengujian deployment independen yang menerima URL deploy dan memeriksa kesehatan service, ketersediaan Swagger UI, serta 1 siklus penuh snapshot, logs, dan heartbeat:
```bash
# Menjalankan verifikasi terhadap cloud production Vercel
npx tsx scripts/verify-deploy.ts https://NAMA-PROYEK-ANDA.vercel.app
```
**Bukti Eksekusi Skrip Verifikasi (Hasil Pengujian Lokal)**:
```text
Target Cloud URL : http://localhost:3000
Demo API Key     : gw_lab01_secret_key_semarang_2026
Kode Ruangan     : lab-01

[1/5] Memeriksa status kesehatan cloud (GET /api/health)... PASSED (Healthy)
[2/5] Memeriksa dokumentasi interaktif (GET /api-docs)... PASSED (HTTP 200 OK)
[3/5] Memeriksa siklus snapshot gateway (GET /api/gateway/snapshot)... PASSED (1 booking aktif, Public Key valid)
[4/5] Memeriksa pengiriman log akses (POST /api/gateway/logs)... PASSED (Diproses secara idempoten)
[5/5] Memeriksa pembaruan heartbeat (PUT /api/gateway/heartbeat)... PASSED (Status Online Terkonfirmasi)
---------------------------------------------------------------
HASIL VERIFIKASI: 5 / 5 pengujian berhasil.
🎉 SELURUH KETENTUAN DEPLOYMENT SERVICE CLOUD TERPENUHI & TERBUKTI!
```

---

## 4. BAGIAN 4 (B4): DOKUMENTASI API

### 4.1. Spesifikasi OpenAPI 3.0 (`docs/openapi.yaml`)
Spesifikasi OpenAPI 3.0 mencakup **26 endpoint lengkap** yang meliputi antarmuka pengguna web dan komunikasi antar-service gateway. Dilengkapi dua skema keamanan:
1. `SessionCookie`: Token cookie HTTP-only `labgate_token` untuk sesi pengguna.
2. `GatewayBearerAuth`: Header `Authorization: Bearer <GATEWAY_API_KEY>` untuk otentikasi gateway pintu.

Dokumentasi dapat diakses secara interaktif melalui antarmuka **Swagger UI** langsung pada route `/api-docs` di Service Cloud.

### 4.2. Bukti Keselarasan Kode dengan OpenAPI (`scripts/verify-openapi.ts`)
Skrip pemeriksa otomatis `scripts/verify-openapi.ts` memastikan tidak ada endpoint di kode yang terlewat di dokumen dan sebaliknya.
**Hasil Eksekusi**:
```text
Ditemukan 26 endpoint pada kode aplikasi Cloud
Ditemukan 26 endpoint pada docs/openapi.yaml
[BERHASIL] Semua endpoint di kode selaras 100% dengan docs/openapi.yaml!
```

### 4.3. Koleksi Postman (`docs/postman/`)
Tersedia dua berkas Postman yang siap diimpor:
1. **Koleksi Request**: `docs/postman/labgate.postman_collection.json`
2. **Environment Lokal & Production**:
   - `docs/postman/labgate_local.postman_environment.json`
   - `docs/postman/labgate_deploy.postman_environment.json`

Alur pengujian Postman disusun secara berurutan (*sequential chaining*):
1. `GET /api/health`
2. `POST /api/auth/login` (Mahasiswa)
3. `POST /api/bookings` (Mengajukan peminjaman, menyimpan `bookingId`)
4. `POST /api/auth/login` (Dosen)
5. `PUT /api/bookings/{{bookingId}}/decision` (Menyetujui dan menerbitkan QR)
6. `GET /api/gateway/snapshot` (Gateway mengambil cache offline)
7. `POST /api/gateway/logs` (Gateway mengirimkan event tap)
8. `PUT /api/gateway/heartbeat` (Gateway melaporkan online)
9. `POST /api/rooms/lab-01/remote-unlock` (Dosen memicu remote unlock)
10. `GET /api/gateway/commands` (Gateway mengambil perintah, menyimpan `commandId`)
11. `DELETE /api/gateway/commands/{{commandId}}` (Gateway menghapus perintah)
12. `GET /status` (Status kiosk lokal port 4000)
13. `POST /manual-override` (Emergency PIN 1722)

---

## 5. DAFTAR TINDAKAN & BUKTI MANUAL YANG HARUS DIAMBIL

Untuk melengkapi laporan tugas akhir perkuliahan dengan bukti otentik, berikut daftar tindakan manual yang perlu Anda lakukan beserta panduannya:

- [ ] **1. Deploy Service Cloud ke Akun Vercel Pribadi**:
  - Push folder `labgate` ke repositori GitHub pribadi Anda.
  - Masuk ke dashboard [vercel.com](https://vercel.com) -> *Add New Project* -> pilih repositori GitHub.
  - Set *Root Directory* ke `apps/cloud`.
  - Masukkan Environment Variables (`DATABASE_URL`, `JWT_SECRET`, `CARD_PEPPER`).
  - Klik **Deploy**.
  - Catat URL publik yang dihasilkan (misal `https://labgate-undip.vercel.app`).
  - *Tangkapan Layar yang Harus Diambil*: Halaman dashboard Vercel berstatus *Production Ready (Green Checkmark)* beserta URL domain.

- [ ] **2. Jalankan Skrip Verifikasi Deploy**:
  - Jalankan di terminal:
    ```bash
    npx tsx scripts/verify-deploy.ts https://URL-VERCEL-ANDA.vercel.app
    ```
  - *Tangkapan Layar yang Harus Diambil*: Output terminal yang menampilkan `5 / 5 pengujian berhasil` dan teks `SELURUH KETENTUAN DEPLOYMENT SERVICE CLOUD TERPENUHI & TERBUKTI`.

- [ ] **3. Tangkapan Layar Tampilan Web Cloud (`http://localhost:3000` atau URL Vercel)**:
  - *Screenshot 1*: Halaman Login (`/login`) dengan pilihan akun demo cepat.
  - *Screenshot 2*: Halaman Dashboard Mahasiswa (`/dashboard`) yang menampilkan status booking disetujui dan modal Tiket QR.
  - *Screenshot 3*: Halaman Approval Dosen (`/approval`) saat menyetujui peminjaman.
  - *Screenshot 4*: Halaman Swagger UI interaktif (`/api-docs`).

- [ ] **4. Tangkapan Layar Kiosk Gateway (`http://localhost:4000`)**:
  - *Screenshot 1*: Layar Kiosk saat posisi idle dan kamera webcam laptop aktif mendeteksi QR.
  - *Screenshot 2*: Layar Kiosk saat kartu/QR berhasil dipindai dengan kartu warna hijau *"AKSES DITERIMA - Muhammad Isya Asyhari"*.
  - *Screenshot 3*: Modal Emergency PIN saat memasukkan PIN `1722`.

- [ ] **5. Tangkapan Layar Simulasi Wokwi**:
  - Buka proyek Wokwi dengan file `firmware/sketch.ino`, `firmware/diagram.json`, dan `firmware/libraries.txt`.
  - Jalankan simulasi dan dekatkan kartu Blue (UID `01020304`).
  - *Screenshot*: Layar LCD 16x2 Wokwi yang bertuliskan *"AKSES DITERIMA: Isya"* dan relay menyala.
