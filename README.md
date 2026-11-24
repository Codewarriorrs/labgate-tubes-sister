# LabGate - Sistem Terintegrasi Pintu Laboratorium

LabGate adalah sistem akses pintu laboratorium terintegrasi yang memadukan peminjaman ruangan/alat secara mobile oleh mahasiswa, persetujuan bertingkat oleh dosen/admin, pencegahan jadwal bentrok di database PostgreSQL, serta gate scanner lokal berbasis Edge Gateway (Port 4000) yang tetap mampu memvalidasi akses secara offline saat internet kampus padam.

Proyek ini dibangun untuk memenuhi ketentuan baku tugas besar mata kuliah **Sistem Terintegrasi** (Semester 5).

---

## 1. Arsitektur Monorepo

```text
labgate/
├── apps/
│   ├── cloud/          # SERVICE 1 (Cloud - Vercel): Next.js 14 App Router, PostgreSQL Neon, REST API
│   └── gateway/        # SERVICE 2 (Lokal - Port 4000): Node.js + Express, SQLite (better-sqlite3), Kiosk UI
├── firmware/           # Periferal Mikrokontroler (Wokwi / Fisik): ESP32, RFID RC522, LCD 16x2, Relay Solenoid
├── docs/
│   ├── REFERENSI.md    # Temuan nyata inspeksi proyek referensi
│   ├── KONTRAK.md      # Spesifikasi kontrak protokol MQTT & HTTP REST inter-service
│   ├── ARSITEKTUR.md   # Diagram konteks, komponen, ERD, dan sequence diagram
│   ├── LAPORAN.md      # Laporan resmi komprehensif (B1 s/d B5)
│   ├── PRESENTASI.md   # Materi presentasi 8 slide dan panduan skrip demo langsung
│   ├── KESESUAIAN.md   # Matriks bukti pemenuhan ketentuan tugas A1-A4 dan B1-B5
│   ├── openapi.yaml    # Spesifikasi teknis OpenAPI 3.0 (26 endpoint)
│   ├── postman/        # Koleksi Postman alur berurutan & Environment
│   └── diagram/        # Berkas diagram arsitektur format SVG
├── scripts/
│   ├── simulate-scan.ts    # Simulasi publish scan RFID ke MQTT tanpa butuh browser/Wokwi
│   ├── test-integration.ts # Pengujian integrasi 4 metode HTTP & simulasi offline
│   ├── verify-deploy.ts    # Skrip verifikasi kesehatan dan inter-service URL deploy Vercel
│   └── verify-openapi.ts   # Skrip validasi keselarasan kode dengan openapi.yaml
└── package.json        # Root npm workspaces
```

---

## 2. Persyaratan & Instalasi

Pastikan sistem telah terinstal **Node.js v20+** (disarankan v22) dan **npm**.

```bash
# Masuk ke direktori proyek
cd labgate

# Instal dependensi monorepo
npm install
```

---

## 3. Menjalankan Sistem Secara Lokal

### Jalankan Service 1 (Cloud)
```bash
npm run dev:cloud
```
* Buka browser pada alamat: `http://localhost:3000`
* Dokumentasi interaktif Swagger UI tersedia di: `http://localhost:3000/api-docs`

**Akun Demo Kampus Semarang (Password: `Semarang2026!`)**:
- **Mahasiswa**: `isya.asyhari@students.undip.ac.id` (Muhammad Isya Asyhari - KTM UID: `01020304`)
- **Dosen**: `danang.setiawan@undip.ac.id` (Dr. Ir. Danang Setiawan, M.T.)
- **Admin**: `aryo.wicaksono@undip.ac.id` (Aryo Wicaksono, S.Kom.)

### Jalankan Service 2 (Gateway Lokal di Depan Pintu)
```bash
npm run dev:gateway
```
* Buka browser pada alamat: `http://localhost:4000`
* Tampilan Kiosk interaktif langsung aktif dengan webcam scanner tiket QR.
* **Emergency Override PIN**: Masukkan kode **`1722`** untuk membuka pintu darurat.

---

## 4. Simulasi Hardware ESP32 di Wokwi

1. Buka situs [Wokwi.com](https://wokwi.com) dan buat proyek **ESP32**.
2. Salin isi berkas berikut ke Wokwi:
   - `firmware/sketch.ino` -> Salin ke tab kode Arduino.
   - `firmware/diagram.json` -> Salin ke tab diagram Wokwi.
   - `firmware/libraries.txt` -> Salin ke tab library manager Wokwi.
3. Jalankan simulasi di Wokwi. ESP32 otomatis terhubung ke WiFi `Wokwi-GUEST` dan Broker MQTT `broker.hivemq.com`.
4. Dekatkan kartu RFID Blue (UID `01020304`) ke sensor RFID RC522:
   - LCD 16x2 menampilkan: `AKSES DITERIMA` dan nama `Isya`.
   - Relay solenoid membuka kunci pintu selama 5 detik.

### Alternatif Pengujian Hardware Tanpa Wokwi:
```bash
# Menyimulasikan tap kartu KTM mahasiswa Isya
npx tsx scripts/simulate-scan.ts 01020304

# Menyimulasikan tap kartu asing / tidak terdaftar
npx tsx scripts/simulate-scan.ts 99999999
```

---

## 5. Menjalankan Pengujian Otomatis

```bash
# 1. Jalankan Unit Test (Vitest) di Cloud dan Gateway
npm test

# 2. Periksa Keselarasan Spesifikasi OpenAPI dengan Kode
npx tsx scripts/verify-openapi.ts

# 3. Jalankan Pengujian Integrasi 4 Metode REST & Skenario Offline
npx tsx scripts/test-integration.ts
```

---

## 6. Panduan Deployment Service Cloud ke Vercel (Ketentuan A2 & B3)

1. Buat basis data PostgreSQL gratis di [Neon.tech](https://neon.tech) atau Supabase, lalu salin connection string-nya (`DATABASE_URL`).
2. Jalankan skema database jika diinginkan:
   - Buka SQL Editor di Neon dan eksekusi seluruh perintah dari `apps/cloud/schema.sql`.
3. Buat repositori baru di GitHub dan lakukan push folder `labgate`.
4. Masuk ke [Vercel Dashboard](https://vercel.com) -> Klik **Add New Project** -> Impor repositori GitHub Anda.
5. Konfigurasikan proyek di Vercel:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/cloud`
   - **Environment Variables**:
     - `DATABASE_URL`: Isi connection string PostgreSQL Anda
     - `JWT_SECRET`: Minimal 32 karakter (contoh: `labgate-undip-tembalang-semarang-secret-jwt-key-2026-min32`)
     - `CARD_PEPPER`: `labgate_undip_tembalang_secure_pepper_2026`
6. Klik **Deploy**.
7. Setelah selesai, uji deployment cloud Anda dengan skrip verifikasi otomatis:
   ```bash
   npx tsx scripts/verify-deploy.ts https://URL-PROYEK-VERCEL-ANDA.vercel.app
   ```
8. Arahkan Gateway lokal ke URL Vercel dengan menyetel file `.env` di `apps/gateway`:
   ```env
   CLOUD_URL=https://URL-PROYEK-VERCEL-ANDA.vercel.app
   ```
