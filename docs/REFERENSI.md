# Dokumen Temuan Referensi Teknis (docs/REFERENSI.md)

Dokumen ini mencatat temuan nyata hasil inspeksi dua repositori referensi:
1. **Proyek A**: `C:\Users\DELL\Downloads\Kuliah\Semester 5\Praktikum PPB\ta-ppb-lapor-kampus`
2. **Proyek B**: `C:\Users\DELL\Downloads\Kuliah\Projek-Bimbel\pelita-ilmu`

Sesuai instruksi tugas, jika kedua proyek memiliki perbedaan stack, **Proyek A (`ta-ppb-lapor-kampus`) dipilih sebagai acuan utama Service 1 (Cloud)** karena arsitekturnya (Next.js + TypeScript + PostgreSQL) kompatibel penuh dengan target deployment Vercel, berbagi ekosistem TypeScript dengan Service 2 (Gateway), serta telah mengadopsi standar enkripsi modern `jose` (Ed25519/JWT) dan validasi Zod.

---

## 1. Stack dan Versi Dependensi

### Proyek A: `ta-ppb-lapor-kampus`
- **Framework Web & API**: Next.js 14.2.20 (App Router), React 18.3.1, TypeScript 5.6.3
- **Database Client & ORM**: PostgreSQL via `@neondatabase/serverless` (v1.2.1) dan `@supabase/supabase-js` (v2.46.1)
- **Autentikasi & Kriptografi**:
  - `jose` (v5.9.6) untuk penandatanganan dan verifikasi JWT / token kriptografis.
  - `bcryptjs` (v2.4.3) untuk hashing password.
- **Validasi**: `zod` (v3.23.8)
- **Styling**: `tailwindcss` (v3.4.14), `postcss` (v8.4.47), `tailwind-merge` (v3.7.1), `clsx` (v2.1.1)
- **Ikon UI**: `lucide-react` (v0.454.0)

### Proyek B: `pelita-ilmu`
- **Framework**: Laravel 12.x (PHP 8.2+), Laravel Tinker
- **Admin & UI**: Filament 3.x/5.x (`filament/filament`, `althinect/filament-spatie-roles-permissions`)
- **Frontend Assets**: Vite (`vite.config.js`), Tailwind CSS, PostCSS
- **Database**: Eloquent ORM dengan SQLite / MySQL driver

---

## 2. Struktur Folder dan Konvensi Penamaan

### Struktur Proyek A (`ta-ppb-lapor-kampus`)
```text
ta-ppb-lapor-kampus/
├── app/
│   ├── api/             # Route Handlers Next.js App Router (REST API)
│   │   ├── auth/        # /api/auth/login, /api/auth/register, /api/auth/me
│   │   └── ...          # Resource endpoints (kategori, laporan, dsb.)
│   ├── globals.css      # Definisi token CSS kustom
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Dashboard / Entry page
├── components/          # Komponen UI modular (Navbar, Card, Modal, Form)
├── lib/                 # Utilitas inti: auth.ts, neon.ts, utils.ts
├── types/               # Definisi TypeScript interface / DTO
├── postman/             # Koleksi Postman pengujian API
└── scripts/             # Skrip automasi & migrasi database
```

### Konvensi Penamaan:
- **File route API**: `app/api/<resource>/route.ts` atau `app/api/<resource>/[id]/route.ts`
- **File komponen**: PascalCase (`Button.tsx`, `BottomNav.tsx`, `Modal.tsx`)
- **Fungsi dan variabel**: camelCase (`hashPassword`, `signToken`, `currentUser`)
- **Tabel database & kolom**: snake_case (`password_hash`, `room_id`, `created_at`)

---

## 3. Bentuk Respons API, Validasi, dan Error Handling

### Standar Respons JSON
Mengikuti standar respons terstruktur di `ta-ppb-lapor-kampus`:
```json
{
  "success": true,
  "data": { ... },
  "message": "Deskripsi hasil operasi"
}
```
Ketika terjadi kegagalan/error:
```json
{
  "success": false,
  "data": null,
  "message": "Pesan error manusiawi yang spesifik",
  "error": { ... }
}
```

### Validasi Request
- Menggunakan schema `zod` (`safeParse(body)`).
- Jika `!validatedData.success`, mengembalikan status `400 Bad Request` dengan pesan error pertama yang jelas (`validatedData.error.errors[0]?.message`).

---

## 4. Design Token dan Pola Komponen UI

Ditemukan pada `tailwind.config.js` di `ta-ppb-lapor-kampus`:
- **Warna Utama (Navy & Neutrals)**:
  - `primary`: `#1e3a8a` (Deep Navy Blue)
  - `primary-hover`: `#172554`
  - `primary-light`: `#2563eb`
  - `background`: `#f4f6fb` (Soft Cool Grey/Blue)
  - `surface`: `#ffffff` (Pure White Card)
  - `surface-strong`: `#f0f4fa`
  - `text`: `#0f172a` (Slate 900)
  - `text-muted`: `#64748b` (Slate 500)
  - `accent`: `#0284c7` (Sky Cyan Accent)
  - `mint / success`: `#10b981` (Emerald 500)
  - `danger`: `#ef4444` (Rose/Red 500)
- **Tipografi**:
  - `sans`: `'Inter', 'Quicksand', system-ui, sans-serif`
  - Ukuran heading: `text-xl font-bold`, `text-lg font-semibold`
  - Ukuran body: `text-sm text-text-muted`
- **Radius & Spacing**:
  - Border radius: `rounded-xl` (`12px`) dan `rounded-2xl` (`16px`) untuk card dan modal.
  - Spacing form: `p-4` atau `p-6`, gap `space-y-4`.
  - Border: `border border-slate-200`.

---

## 5. Pola Autentikasi dan Role

- **Sesi Cookie**:
  - Token JWT disimpan di cookie HTTP-only dengan nama cookie aman (misal `labgate_token`).
  - Menggunakan `jose` `SignJWT` dengan masa berlaku 7 hari dan verifikasi `jwtVerify`.
- **Role Pengguna**:
  - Mahasiswa: booking ruangan/alat, melihat status tiket, tiket QR.
  - Dosen / Admin: menyetujui/menolak booking, manajemen ruangan, manajemen kartu RFID, log audit, remote unlock.

---

## 6. Environment Variables dan Strategi Deploy

- **Environment Variables**:
  - `DATABASE_URL`: Connection string PostgreSQL (Neon).
  - `JWT_SECRET`: Kunci rahasia minimal 32 karakter untuk penandatanganan JWT.
  - `QR_PRIVATE_KEY` & `QR_PUBLIC_KEY`: Pasangan kunci Ed25519 untuk penandatanganan tiket offline.
  - `CARD_PEPPER`: String acak untuk pepper hashing UID RFID (SHA-256).
  - `GATEWAY_API_KEY`: Kunci rahasia komunikasi gateway-ke-cloud.
- **Deployment**:
  - Disiapkan untuk deployment zero-config ke platform **Vercel** melalui file konfigurasi standar Next.js.
