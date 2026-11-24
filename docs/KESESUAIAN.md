# Matriks Kesesuaian Ketentuan Tugas LabGate (docs/KESESUAIAN.md)

Dokumen ini memetakan setiap butir ketentuan tugas secara transparan dan jujur ke bukti konkret pada kode sumber, endpoint, hasil tes otomatis, serta daftar tindakan manual yang harus dilakukan oleh mahasiswa.

---

## 1. TABEL KESESUAIAN KETENTUAN UTAMA (A1 - A4)

| Kode | Ketentuan Tugas | Status Bukti | Bukti Konkret (File, Endpoint, & Tes) | Keterangan / Tindakan Mahasiswa |
| :--- | :--- | :---: | :--- | :--- |
| **A1** | Sistem terdiri dari DUA service yang saling berkomunikasi lewat HTTP REST API, dengan metode GET, POST, PUT, dan DELETE semuanya dipakai di komunikasi antar-service (bukan hanya di browser). | **TERBUKTI 100%** | &bull; Service 1: `apps/cloud`<br>&bull; Service 2: `apps/gateway`<br>&bull; **GET**: `/api/gateway/snapshot` (Snapshot offline)<br>&bull; **POST**: `/api/gateway/logs` (Outbox sync)<br>&bull; **PUT**: `/api/gateway/heartbeat` (Status gate)<br>&bull; **GET**: `/api/gateway/commands` (Antrean perintah)<br>&bull; **DELETE**: `/api/gateway/commands/{id}` (Konfirmasi)<br>&bull; Tes: `scripts/test-integration.ts` lulus 100% | Keempat metode HTTP terbukti dieksekusi secara bermakna pada komunikasi machine-to-machine antar kedua service. |
| **A2** | Salah satu service di-deploy ke cloud (Vercel/Firebase/AWS/GCP); service lainnya berjalan lokal. | **SIAP DEPLOY (Perlu Akun Mahasiswa)** | &bull; Konfigurasi: `apps/cloud/package.json` & standalone Next.js 14.<br>&bull; Skrip Verifikasi: `scripts/verify-deploy.ts`<br>&bull; Service Gateway tetap berjalan lokal di Port 4000.<br>&bull; Gateway membaca `CLOUD_URL` dari env. | Kode cloud sudah lulus build (`npm run build`). Mahasiswa tinggal menghubungkan repositori GitHub ke akun Vercel pribadinya dan menjalankan `npx tsx scripts/verify-deploy.ts <URL_VERCEL>`. |
| **A3** | Basis data boleh relasional/non-relasional sesuai kebutuhan masing-masing service. | **TERBUKTI 100%** | &bull; **Cloud**: PostgreSQL relasional (`apps/cloud/schema.sql` & `lib/db.ts`) dengan ekstensi `btree_gist` dan exclusion constraint.<br>&bull; **Gateway**: SQLite lokal (`apps/gateway/src/sqliteDb.ts`) berbasis `better-sqlite3` untuk offline cache dan outbox. | Kedua service menggunakan basis data yang tepat guna sesuai kebutuhan arsitektur terdistribusi. |
| **A4** | Ada dokumentasi API (Swagger/OpenAPI dan koleksi Postman). | **TERBUKTI 100%** | &bull; **OpenAPI 3.0**: `docs/openapi.yaml` (26 endpoint)<br>&bull; **Swagger UI**: `/api-docs` pada Service Cloud.<br>&bull; **Koleksi Postman**: `docs/postman/labgate.postman_collection.json` (Alur berurutan lengkap).<br>&bull; **Environment**: `labgate_local` dan `labgate_deploy`.<br>&bull; Skrip Uji: `scripts/verify-openapi.ts` lulus 26/26 endpoint. | Seluruh endpoint terbukti selaras 100% tanpa ada yang terlewat. |

---

## 2. TABEL KESESUAIAN ASPEK PENILAIAN (B1 - B5)

| Kode | Aspek Penilaian | Status Bukti | Bukti Konkret | Tindakan yang Harus Dilakukan Mahasiswa |
| :--- | :--- | :---: | :--- | :--- |
| **B1** | Desain arsitektur dan diagram sistem | **LENGKAP 100%** | &bull; `docs/ARSITEKTUR.md` memuat seluruh diagram Mermaid.<br>&bull; Berkas visual SVG di `docs/diagram/`:<br>  - `1-konteks-sistem.svg`<br>  - `5-deployment-diagram.svg`<br>&bull; Diagram sekuensial lengkap (booking, approval, tap online, tap offline, remote unlock). | Mahasiswa dapat menyalin teks dan menyisipkan berkas SVG ke dalam dokumen PDF tugas kuliah. |
| **B2** | Implementasi dua service dan komunikasi API | **LENGKAP & TERUJI 100%** | &bull; Kode sumber Service 1 (`apps/cloud`) dan Service 2 (`apps/gateway`).<br>&bull; Mesin keputusan fungsi murni (`apps/gateway/src/decisionEngine.ts`).<br>&bull; Seluruh 16 unit test vitest lulus 100%.<br>&bull; Pengujian integrasi `scripts/test-integration.ts` lulus 100%. | Mahasiswa dapat mendemonstrasikan pengujian integrasi langsung di hadapan dosen. |
| **B3** | Deployment cloud | **SIAP & TERVERIFIKASI** | &bull; Build Next.js 14 sukses (`Generating static pages (25/25)`).<br>&bull; Skrip `scripts/verify-deploy.ts` siap menguji URL Vercel mahasiswa.<br>&bull; Panduan step-by-step di `README.md`. | Mahasiswa mengimpor repositori ke dashboard Vercel, memasukkan env `DATABASE_URL`, dan mengambil tangkapan layar dashboard Vercel. |
| **B4** | Dokumentasi API | **LENGKAP 100%** | &bull; `docs/openapi.yaml`<br>&bull; `apps/cloud/app/api-docs/page.tsx` (Swagger UI)<br>&bull; Koleksi Postman di `docs/postman/`<br>&bull; Skrip `scripts/verify-openapi.ts` lulus. | Mahasiswa mengimpor berkas JSON ke aplikasi Postman dan mengambil screenshot hasil *Run Collection*. |
| **B5** | Laporan dan presentasi (berisi B1 s/d B4) | **LENGKAP 100%** | &bull; `docs/LAPORAN.md` (Laporan komprehensif 5 bagian).<br>&bull; `docs/PRESENTASI.md` (Kerangka 8 slide + skrip demo langkah demi langkah).<br>&bull; `docs/REFERENSI.md` (Temuan inspeksi proyek referensi).<br>&bull; `docs/KONTRAK.md` (Spesifikasi MQTT dan REST). | Mahasiswa melengkapi laporan dengan menyisipkan screenshot hasil deploy dan demo. |

---

## 3. CHECKLIST AKHIR SEBELUM PENGUMPULAN TUGAS

- [x] Kode sumber Service 1 Cloud selesai dan lulus build
- [x] Kode sumber Service 2 Gateway lokal selesai dan lulus build
- [x] Firmware Wokwi ESP32 (`sketch.ino`, `diagram.json`, `libraries.txt`) selesai
- [x] Mesin keputusan murni lulus pengujian semua kode penolakan dan batas toleransi waktu
- [x] Verifikasi offline QR tiket dengan Ed25519 lulus pengujian
- [x] Idempotensi log outbox terbukti
- [x] Pencegahan booking bentrok (conflict detection) terbukti
- [x] Kiosk UI di Port 4000 siap digunakan dengan webcam scanner dan PIN darurat 1722
- [x] OpenAPI 3.0 & Swagger UI di `/api-docs` selaras 100% dengan kode
- [x] Koleksi Postman alur berurutan siap diimpor
- [x] Diagram arsitektur dan SVG lengkap
- [x] Laporan dan materi presentasi lengkap
- [ ] *Tindakan Pribadi*: Push ke GitHub dan Deploy ke Vercel dengan akun pribadi
- [ ] *Tindakan Pribadi*: Ambil screenshot live deploy dan Swagger UI untuk dilampirkan
