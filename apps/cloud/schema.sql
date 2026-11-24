-- LabGate PostgreSQL Database Schema
-- Ekstensi untuk pencegahan booking bentrok (Exclusion Constraint)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Tabel Pengguna (Mahasiswa, Dosen, Admin)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('mahasiswa', 'dosen', 'admin')),
    department VARCHAR(255) NOT NULL,
    nim VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Ruangan & Perangkat Gateway
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    capacity INT NOT NULL DEFAULT 30,
    description TEXT,
    api_key_hash VARCHAR(64) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMPTZ,
    last_sync TIMESTAMPTZ,
    version VARCHAR(32),
    queue_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Kartu RFID / KTM (Hash SHA-256 + Pepper)
CREATE TABLE IF NOT EXISTS cards (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uid_hash VARCHAR(64) UNIQUE NOT NULL,
    label VARCHAR(128) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Alat Laboratorium
CREATE TABLE IF NOT EXISTS equipment (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Booking / Peminjaman
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    equipment_id VARCHAR(64) REFERENCES equipment(id) ON DELETE SET NULL,
    purpose TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'disetujui', 'ditolak', 'dibatalkan')),
    rejection_reason TEXT,
    qr_token TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Cegah booking bentrok di sisi database PostgreSQL
    CONSTRAINT no_overlapping_active_bookings EXCLUDE USING gist (
        room_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    ) WHERE (status IN ('menunggu', 'disetujui'))
);

-- 6. Tabel Log Akses (Riwayat Tap / Scan)
CREATE TABLE IF NOT EXISTS access_logs (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) UNIQUE NOT NULL,
    room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    method VARCHAR(32) NOT NULL CHECK (method IN ('rfid', 'qr', 'manual_pin', 'remote_unlock')),
    identifier VARCHAR(255) NOT NULL,
    result VARCHAR(32) NOT NULL CHECK (result IN ('granted', 'denied')),
    reason VARCHAR(255),
    user_name VARCHAR(255),
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Antrean Perintah Gateway (Remote Unlock / Force Sync)
CREATE TABLE IF NOT EXISTS gateway_commands (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    payload JSONB DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indeks Tambahan untuk Query Kinerja Cepat
CREATE INDEX IF NOT EXISTS idx_bookings_room_status ON bookings(room_id, status);
CREATE INDEX IF NOT EXISTS idx_access_logs_room_time ON access_logs(room_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_commands_room_status ON gateway_commands(room_id, status);
