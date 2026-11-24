# Kerangka Presentasi & Skrip Demo Pengujian Sistem LabGate (docs/PRESENTASI.md)

**Mata Kuliah**: Sistem Terintegrasi  
**Presenter**: Muhammad Isya Asyhari (NIM: 21120124130051)  
**Alokasi Waktu**: 10 - 15 Menit  

---

## DAFTAR SLIDE PRESENTASI (8 SLIDE LENGKAP)

```text
Slide 1: Judul & Latar Belakang Masalah Gate Laboratorium Kampus
Slide 2: Arsitektur Sistem: Dua Service Mandiri (HTTP REST) + Periferal ESP32 (MQTT)
Slide 3: Alur Bisnis: Booking Mahasiswa, Approval Dosen, & Penerbitan Tiket QR
Slide 4: Komunikasi Antar-Service: Penggunaan 4 Metode REST (GET, POST, PUT, DELETE)
Slide 5: Mekanisme Ketahanan Offline (Offline Resilience) & Kriptografi Ed25519
Slide 6: Strategi Deployment Cloud (Vercel & Neon PostgreSQL)
Slide 7: Dokumentasi API Interaktif (OpenAPI 3.0 & Koleksi Postman)
Slide 8: Demonstrasi Sistem Langkah-demi-Langkah & Kesimpulan
```

---

### Slide 1: Judul & Latar Belakang Masalah
- **Judul**: LabGate - Sistem Terintegrasi Pintu Laboratorium Berbasis Edge Offline-Resilient
- **Latar Belakang Masalah**:
  1. *Jadwal Bentrok*: Mahasiswa sering berebut ruangan laboratorium karena tidak ada pencegahan jadwal bentrok otomatis di database.
  2. *Ketergantungan Internet Penuh*: Sistem smart gate konvensional gagal memvalidasi akses ketika jaringan internet kampus mati atau lambat.
  3. *Kendala Kartu Fisik*: Mahasiswa yang tertinggal KTM tidak memiliki alternatif akses resmi yang aman.
- **Tujuan Proyek**: Membangun sistem terdistribusi dua service yang andal, aman, dan tetap mampu memvalidasi hak akses pintu 100% meskipun koneksi internet terputus total.

---

### Slide 2: Arsitektur Sistem (Dua Service + Periferal)
- **Service 1 (Cloud - Vercel)**:
  - Frontend Mobile-First (Next.js 14 App Router) untuk booking dari smartphone.
  - Backend REST API Server & PostgreSQL (Neon) dengan *Exclusion Constraint*.
  - Generator token tiket QR bertanda tangan kunci privat Ed25519.
- **Service 2 (Edge Gateway Lokal - Port 4000)**:
  - Node.js Express + SQLite (`better-sqlite3`) di komputer gate lab.
  - Kiosk UI interaktif dengan pemindai QR berbasis kamera webcam device.
  - Antrean outbox lokal dan mesin keputusan murni (*pure function*).
- **Perangkat Periferal Fisik/Simulasi (ESP32)**:
  - Sensor RFID RC522, LCD 16x2 I2C, Relay Solenoid Pintu.
  - Berkomunikasi dengan Gateway melalui protokol **MQTT** (Mosquitto/HiveMQ).
  - *Catatan: ESP32 adalah periferal perangkat keras, bukan service.*

---

### Slide 3: Alur Bisnis Pengguna
1. **Pengajuan (Mahasiswa)**:
   - Login -> Pilih Lab (`lab-01`) -> Pilih jam peminjaman -> Kirim permohonan.
   - Server menolak seketika (HTTP 409) bila jadwal bertabrakan dengan jadwal aktif lain.
2. **Approval (Dosen/Admin)**:
   - Dosen membuka antrean approval -> Memeriksa keperluan -> Klik **Setujui** (atau **Tolak** dengan alasan).
   - Tiket QR ber-tanda tangan kriptografis otomatis diterbitkan saat status disetujui.
3. **Pemberian Akses di Pintu**:
   - Mahasiswa menempelkan KTM fisik atau memperlihatkan tiket QR ke kamera laptop gate.

---

### Slide 4: Komunikasi Antar-Service (Pemenuhan Ketentuan A1)
Keempat metode HTTP digunakan pada komunikasi antar-service:
- **GET `/api/gateway/snapshot`**: Gateway mengambil kunci publik dan daftar booking disetujui untuk disimpan ke cache SQLite lokal.
- **POST `/api/gateway/logs`**: Gateway mengirimkan rekaman riwayat akses dari outbox SQLite secara berkelompok (idempoten terhadap `eventId`).
- **PUT `/api/gateway/heartbeat`**: Gateway memperbarui status online, waktu sinkron, dan antrean outbox di server cloud.
- **GET `/api/gateway/commands`**: Gateway memeriksa antrean perintah dosen/admin (misal: Buka Pintu Jarak Jauh).
- **DELETE `/api/gateway/commands/{id}`**: Gateway mengonfirmasi bahwa solenoid pintu fisik telah terbuka dan menghapus perintah dari antrean cloud.

---

### Slide 5: Ketahanan Offline & Kriptografi
- **Verifikasi Asimetris Ed25519**: Kunci privat hanya berada di Cloud. Kunci publik dibagikan ke Gateway saat sinkronisasi, memungkinkan Gateway memvalidasi keaslian tiket QR secara matematis tanpa menghubungi Cloud!
- **Toleransi Waktu Dinamis**: Mahasiswa diizinkan masuk dalam jendela waktu:
  $$[\text{Jam Mulai} - 10\text{ menit},\, \text{Jam Selesai} + 5\text{ menit}]$$
- **Emergency Manual PIN**: Petugas piket dapat membuka kunci pintu darurat langsung di layar Kiosk dengan memasukkan PIN **`1722`**.

---

### Slide 6: Deployment Cloud & Database Relasional
- **Cloud Hosting**: Deployed ke **Vercel** dengan konfigurasi *Serverless Edge*.
- **Relational Database**: **PostgreSQL (Neon)** menggunakan ekstensi `btree_gist`:
  ```sql
  CONSTRAINT no_overlapping_active_bookings EXCLUDE USING gist (
      room_id WITH =,
      tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('menunggu', 'disetujui'))
  ```
- **Verifikasi Deployment**: Skrip `scripts/verify-deploy.ts` membuktikan 5 dari 5 pengujian lulus 100%.

---

### Slide 7: Dokumentasi API & Postman Collection
- **OpenAPI 3.0 (`docs/openapi.yaml`)**: Mencakup 26 endpoint lengkap dengan 2 skema keamanan (`SessionCookie` & `GatewayBearerAuth`).
- **Swagger UI**: Disajikan interaktif langsung di `/api-docs`.
- **Koleksi Postman**: `docs/postman/labgate.postman_collection.json` dengan alur pengujian berantai dari login, booking, approve, snapshot, hingga remote unlock.
- **Skrip Verifikasi**: `scripts/verify-openapi.ts` mengonfirmasi keselarasan 100% antara kode dan spesifikasi.

---

### Slide 8: Kesimpulan
1. Seluruh ketentuan tugas baku (A1 s/d A4 dan B1 s/d B5) telah terimplementasi secara lengkap dan terbukti melalui pengujian otomatis.
2. Gateway lokal menjamin pintu lab tetap dapat diakses saat koneksi internet kampus terputus total.
3. Desain antarmuka bersih bergaya alat kerja universitas, bebas dari *AI slop*, serta responsif untuk perangkat mobile.

---

## PANDUAN SKRIP DEMO LANGKAH-DEMI-LANGKAH (LIVE DEMONSTRATION)

Ikuti urutan langkah ini saat melakukan demonstrasi di hadapan dosen penguji:

### Skenario 1: Booking & Approval Bertingkat
1. Buka browser pada alamat `http://localhost:3000` (atau URL Vercel).
2. Di halaman login, klik tombol demo **Muhammad Isya Asyhari (Mahasiswa)** -> Klik **Masuk**.
3. Di dashboard, tunjukkan form booking: pilih `lab-01`, jam mulai dan selesai -> Klik **Kirim Pengajuan Booking**.
4. Log out, lalu login sebagai **Dr. Ir. Danang Setiawan, M.T. (Dosen)**.
5. Buka menu **Approval**: perlihatkan pengajuan mahasiswa tadi -> Klik tombol hijau **Setujui**.
6. Log out, login kembali sebagai mahasiswa: perlihatkan bahwa status booking telah berubah menjadi hijau (*Disetujui*), lalu klik tombol **Tiket QR** untuk memunculkan tiket visual ber-tanda tangan Ed25519.

### Skenario 2: Simulasi Tap Kartu KTM di Wokwi / CLI
1. Buka terminal baru, jalankan Service 2 (Gateway):
   ```bash
   npm run dev:gateway
   ```
2. Gateway akan langsung melakukan sinkronisasi awal dan mengambil data booking yang baru saja disetujui.
3. Buka simulasi Wokwi (atau jalankan skrip simulasi scan):
   ```bash
   npx tsx scripts/simulate-scan.ts 01020304
   ```
4. **Hasil**: Terminal menampilkan `🎉 HASIL: PINTU DIBUKA (Relay Aktif 5000ms)`, nama LCD menampilkan `"Muhammad Isya As"`. Di Wokwi, relay menyala dan LCD menampilkan status akses diterima.

### Skenario 3: Uji Coba Mode Offline (Internet Kampus Dimatikan)
1. Matikan Service Cloud (tekan `Ctrl+C` pada terminal Cloud).
2. Buka layar Kiosk Gateway di `http://localhost:4000`: perlihatkan bahwa indikator jaringan berubah menjadi warna kuning: **Offline (Cache Aktif)**.
3. Tempelkan kembali kartu mahasiswa Isya (`01020304`):
   - Klik tombol **Tap KTM Isya (01020304)** di layar kiosk atau jalankan `scripts/simulate-scan.ts 01020304`.
4. **Hasil**: Layar kiosk langsung berubah menjadi hijau besar **AKSES DITERIMA**, menampilkan sisa waktu peminjaman, dan pintu tetap terbuka meskipun server cloud dalam keadaan mati!
5. Tunjukkan bahwa event akses offline ini tersimpan aman di tabel outbox lokal (status `Outbox: 1 event`).

### Skenario 4: Pemulihan Jaringan (Auto-Sync Outbox)
1. Nyalakan kembali Service Cloud (`npm run dev:cloud`).
2. Dalam siklus sinkronisasi berikutnya (atau tunggu 60 detik), perlihatkan bahwa status Kiosk kembali hijau **Online**, dan log tertunda otomatis terkirim ke Cloud tanpa ada duplikasi data.

### Skenario 5: Emergency Override PIN (1722)
1. Di layar Kiosk `http://localhost:4000`, klik tombol **Emergency PIN**.
2. Masukkan PIN **`1722`** -> Klik **Buka Pintu**.
3. Pintu terbuka seketika dan tercatat di riwayat log sebagai akses darurat petugas piket.
