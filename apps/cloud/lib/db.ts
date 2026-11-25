import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { hashCardUid, hashApiKey, signQrTicket } from './crypto';
import {
  User,
  Card,
  Room,
  Equipment,
  Booking,
  AccessLog,
  GatewayCommand,
  BookingStatus,
} from '@/types';

// Inisialisasi PostgreSQL Pool jika DATABASE_URL ada
const DATABASE_URL = process.env.DATABASE_URL;
export const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
  : null;

// ==========================================
// DATA SEED AWAL (KAMPUS SEMARANG)
// ==========================================
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('Semarang2026!', 10);
const DEMO_GATEWAY_KEY = 'gw_lab01_secret_key_semarang_2026';
const DEMO_GATEWAY_KEY_HASH = hashApiKey(DEMO_GATEWAY_KEY);
const ISYA_UID = '01020304';
const ISYA_UID_HASH = hashCardUid(ISYA_UID);
const MALVIN_UID = '11223344';
const MALVIN_UID_HASH = hashCardUid(MALVIN_UID);
const BINTANG_UID = '55667788';
const BINTANG_UID_HASH = hashCardUid(BINTANG_UID);

const now = new Date();
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - 1, 0, 0);
const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 3, 0, 0);

const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 0, 0);

const initialUsers: User[] = [
  {
    id: 'usr_admin_01',
    name: 'Aryo Wicaksono, S.Kom.',
    email: 'aryo.wicaksono@undip.ac.id',
    role: 'admin',
    department: 'Teknik Komputer - Kampus Tembalang',
    nim: '198503152010121002',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_dosen_01',
    name: 'Dr. Ir. Danang Setiawan, M.T.',
    email: 'danang.setiawan@undip.ac.id',
    role: 'dosen',
    department: 'Teknik Komputer - Kampus Tembalang',
    nim: '197808202005011001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_mhs_01',
    name: 'Isya',
    email: 'isya.asyhari@students.undip.ac.id',
    role: 'mahasiswa',
    department: 'Teknik Komputer',
    nim: '21120124130051',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_mhs_02',
    name: 'Malvin',
    email: 'malvin@students.undip.ac.id',
    role: 'mahasiswa',
    department: 'Teknik Komputer',
    nim: '21120124130052',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_mhs_03',
    name: 'Bintang',
    email: 'bintang@students.undip.ac.id',
    role: 'mahasiswa',
    department: 'Teknik Komputer',
    nim: '21120124130053',
    createdAt: new Date().toISOString(),
  },
];

const initialRooms: Room[] = [
  {
    id: 'lab-01',
    code: 'lab-01',
    name: 'Laboratorium Rekayasa Perangkat Lunak & Sistem Terintegrasi',
    capacity: 35,
    description: 'Gedung D Lantai 3 Fakultas Teknik Undip, Tembalang Semarang. Dilengkapi Gate Scanner RFID & Kiosk.',
    apiKeyHash: DEMO_GATEWAY_KEY_HASH,
    isActive: true,
    lastSeen: new Date().toISOString(),
    lastSync: new Date().toISOString(),
    version: '1.0.0',
    queueCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'lab-02',
    code: 'lab-02',
    name: 'Laboratorium Sistem Tertanam & Robotika',
    capacity: 25,
    description: 'Gedung E Lantai 2 Fakultas Teknik Undip. Dilengkapi modul workstation mikrokontroler dan soldering station.',
    apiKeyHash: hashApiKey('gw_lab02_secret_key_semarang_2026'),
    isActive: true,
    lastSeen: null,
    lastSync: null,
    version: '1.0.0',
    queueCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'lab-03',
    code: 'lab-03',
    name: 'Laboratorium Jaringan Komputer & Keamanan Siber',
    capacity: 30,
    description: 'Gedung D Lantai 2 Fakultas Teknik Undip. Dilengkapi rack server dan switch Cisco Catalyst.',
    apiKeyHash: hashApiKey('gw_lab03_secret_key_semarang_2026'),
    isActive: true,
    lastSeen: null,
    lastSync: null,
    version: '1.0.0',
    queueCount: 0,
    createdAt: new Date().toISOString(),
  },
];

const initialEquipment: Equipment[] = [
  {
    id: 'eq_01',
    roomId: 'lab-02',
    name: 'Oscilloscope Digital Rigol DS1054Z 50MHz 4-Channel',
    code: 'OSC-RIGOL-01',
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'eq_02',
    roomId: 'lab-01',
    name: 'Development Board Kit ESP32 & IoT Sensor Pack',
    code: 'IOT-KIT-01',
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
];

const initialCards: Card[] = [
  {
    id: 'crd_01',
    userId: 'usr_mhs_01',
    uidHash: ISYA_UID_HASH,
    label: 'KTM Isya (Blue Card Wokwi)',
    isActive: true,
    createdAt: new Date().toISOString(),
    userName: 'Isya',
    userRole: 'mahasiswa',
  },
  {
    id: 'crd_02',
    userId: 'usr_mhs_02',
    uidHash: MALVIN_UID_HASH,
    label: 'KTM Malvin (Green Card Wokwi)',
    isActive: true,
    createdAt: new Date().toISOString(),
    userName: 'Malvin',
    userRole: 'mahasiswa',
  },
  {
    id: 'crd_03',
    userId: 'usr_mhs_03',
    uidHash: BINTANG_UID_HASH,
    label: 'KTM Bintang (Yellow Card Wokwi)',
    isActive: true,
    createdAt: new Date().toISOString(),
    userName: 'Bintang',
    userRole: 'mahasiswa',
  },
];

const initialBookings: Booking[] = [
  {
    id: 'bkg_aktif_01',
    userId: 'usr_mhs_01',
    userName: 'Isya',
    roomId: 'lab-01',
    roomName: 'Laboratorium Rekayasa Perangkat Lunak & Sistem Terintegrasi',
    roomCode: 'lab-01',
    equipmentId: 'eq_02',
    equipmentName: 'Development Board Kit ESP32 & IoT Sensor Pack',
    purpose: 'Uji Coba Validasi Gate Scanner dan Integrasi MQTT Gateway',
    startTime: todayStart.toISOString(),
    endTime: todayEnd.toISOString(),
    status: 'disetujui',
    qrToken: null, // Diisi saat inisialisasi
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bkg_aktif_02',
    userId: 'usr_mhs_02',
    userName: 'Malvin',
    roomId: 'lab-01',
    roomName: 'Laboratorium Rekayasa Perangkat Lunak & Sistem Terintegrasi',
    roomCode: 'lab-01',
    equipmentId: 'eq_02',
    equipmentName: 'Development Board Kit ESP32 & IoT Sensor Pack',
    purpose: 'Praktikum Sistem Tertanam dan Komputasi Tepi',
    startTime: todayStart.toISOString(),
    endTime: todayEnd.toISOString(),
    status: 'disetujui',
    qrToken: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bkg_aktif_03',
    userId: 'usr_mhs_03',
    userName: 'Bintang',
    roomId: 'lab-01',
    roomName: 'Laboratorium Rekayasa Perangkat Lunak & Sistem Terintegrasi',
    roomCode: 'lab-01',
    equipmentId: 'eq_02',
    equipmentName: 'Development Board Kit ESP32 & IoT Sensor Pack',
    purpose: 'Riset Protokol Komunikasi IoT LabGate',
    startTime: todayStart.toISOString(),
    endTime: todayEnd.toISOString(),
    status: 'disetujui',
    qrToken: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'bkg_menunggu_04',
    userId: 'usr_mhs_02',
    userName: 'Malvin',
    roomId: 'lab-02',
    roomName: 'Laboratorium Sistem Tertanam & Robotika',
    roomCode: 'lab-02',
    equipmentId: 'eq_01',
    equipmentName: 'Oscilloscope Digital Rigol DS1054Z 50MHz 4-Channel',
    purpose: 'Pengukuran Sinyal PWM Motor DC Driver Robot Line Follower',
    startTime: tomorrowStart.toISOString(),
    endTime: tomorrowEnd.toISOString(),
    status: 'menunggu',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// In-Memory Storage State
class MemoryStore {
  users = [...initialUsers];
  passwords: Record<string, string> = {
    'aryo.wicaksono@undip.ac.id': DEFAULT_PASSWORD_HASH,
    'danang.setiawan@undip.ac.id': DEFAULT_PASSWORD_HASH,
    'isya@students.undip.ac.id': DEFAULT_PASSWORD_HASH,
    'isya.asyhari@students.undip.ac.id': DEFAULT_PASSWORD_HASH,
    'malvin@students.undip.ac.id': DEFAULT_PASSWORD_HASH,
    'bintang@students.undip.ac.id': DEFAULT_PASSWORD_HASH,
    'nabila.putri@students.undip.ac.id': DEFAULT_PASSWORD_HASH,
    'rizky.dwi@students.undip.ac.id': DEFAULT_PASSWORD_HASH,
  };
  rooms = [...initialRooms];
  equipment = [...initialEquipment];
  cards = [...initialCards];
  bookings = [...initialBookings];
  accessLogs: AccessLog[] = [];
  commands: GatewayCommand[] = [];

  constructor() {
    this.generateInitialQr();
  }

  async generateInitialQr() {
    const activeBkg = this.bookings.find((b) => b.id === 'bkg_aktif_01');
    if (activeBkg) {
      activeBkg.qrToken = await signQrTicket({
        bookingId: activeBkg.id,
        roomId: activeBkg.roomId,
        roomCode: activeBkg.roomCode || 'lab-01',
        userId: activeBkg.userId,
        userName: activeBkg.userName || 'Muhammad Isya Asyhari',
        startTime: activeBkg.startTime,
        endTime: activeBkg.endTime,
      });
    }
  }
}

export const memoryStore = new MemoryStore();

let dbSeedChecked = false;
let seedPromise: Promise<void> | null = null;

/**
 * Memastikan database PostgreSQL terisi data awal jika tabel baru saja dibuat (kosong).
 */
async function ensureDatabaseSeeded(): Promise<void> {
  if (!pool || dbSeedChecked) return;
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM rooms');
      if (rows[0]?.cnt === 0) {
        for (const u of initialUsers) {
          await pool.query(
            `INSERT INTO users (id, name, email, password_hash, role, department, nim, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
            [u.id, u.name, u.email, DEFAULT_PASSWORD_HASH, u.role, u.department, u.nim || null, u.createdAt]
          );
        }
        for (const r of initialRooms) {
          await pool.query(
            `INSERT INTO rooms (id, name, code, capacity, description, api_key_hash, is_active, last_seen, last_sync, version, queue_count, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT DO NOTHING`,
            [r.id, r.name, r.code, r.capacity, r.description, r.apiKeyHash, r.isActive, r.lastSeen || null, r.lastSync || null, r.version || null, r.queueCount || 0, r.createdAt]
          );
        }
        for (const eq of initialEquipment) {
          await pool.query(
            `INSERT INTO equipment (id, room_id, name, category, is_available, created_at)
             VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
            [eq.id, eq.roomId, eq.name, 'Peralatan Lab', eq.isAvailable, eq.createdAt]
          );
        }
        for (const c of initialCards) {
          await pool.query(
            `INSERT INTO cards (id, user_id, uid_hash, label, created_at)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
            [c.id, c.userId, c.uidHash, c.label, c.createdAt]
          );
        }
        for (const b of initialBookings) {
          let qrToken = b.qrToken || null;
          if (b.status === 'disetujui' && !qrToken) {
            qrToken = await signQrTicket({
              bookingId: b.id,
              roomId: b.roomId,
              roomCode: b.roomCode || b.roomId,
              userId: b.userId,
              userName: b.userName || 'Mahasiswa',
              startTime: b.startTime,
              endTime: b.endTime,
            });
          }
          await pool.query(
            `INSERT INTO bookings (id, user_id, room_id, equipment_id, purpose, start_time, end_time, status, rejection_reason, qr_token, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT DO NOTHING`,
            [b.id, b.userId, b.roomId, b.equipmentId || null, b.purpose, b.startTime, b.endTime, b.status, b.rejectionReason || null, qrToken, b.createdAt, b.updatedAt]
          );
        }
      }
      dbSeedChecked = true;
    } catch (err) {
      console.error('[ensureDatabaseSeeded Error]', err);
    } finally {
      seedPromise = null;
    }
  })();

  return seedPromise;
}

// ==========================================
// REPOSITORY METHODS (POSTGRES / MEMORY FALLBACK)
// ==========================================

export async function findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const normEmail = email.toLowerCase().trim();
  if (pool) {
    await ensureDatabaseSeeded();
    try {
      const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [normEmail]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          department: row.department,
          nim: row.nim,
          createdAt: row.created_at,
          passwordHash: row.password_hash,
        };
      }
    } catch {
      // Fallback memory
    }
  }

  const user = memoryStore.users.find((u) => u.email.toLowerCase() === normEmail);
  if (!user) return null;
  return {
    ...user,
    passwordHash: memoryStore.passwords[user.email] || DEFAULT_PASSWORD_HASH,
  };
}

export async function findUserById(id: string): Promise<User | null> {
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role,
          department: r.department,
          nim: r.nim,
          createdAt: r.created_at,
        };
      }
    } catch {}
  }
  return memoryStore.users.find((u) => u.id === id) || null;
}

export async function listUsers(): Promise<User[]> {
  if (pool) {
    await ensureDatabaseSeeded();
    try {
      const res = await pool.query('SELECT id, name, email, role, department, nim, created_at FROM users ORDER BY name ASC');
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        department: r.department,
        nim: r.nim,
        createdAt: r.created_at,
      }));
    } catch {}
  }
  return [...memoryStore.users];
}

export async function listRooms(): Promise<Room[]> {
  if (pool) {
    await ensureDatabaseSeeded();
    try {
      const res = await pool.query('SELECT * FROM rooms ORDER BY code ASC');
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        capacity: r.capacity,
        description: r.description,
        apiKeyHash: r.api_key_hash,
        isActive: r.is_active,
        lastSeen: r.last_seen,
        lastSync: r.last_sync,
        version: r.version,
        queueCount: r.queue_count,
        createdAt: r.created_at,
      }));
    } catch {}
  }
  return [...memoryStore.rooms];
}

export async function getRoomById(id: string): Promise<Room | null> {
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          name: r.name,
          code: r.code,
          capacity: r.capacity,
          description: r.description,
          apiKeyHash: r.api_key_hash,
          isActive: r.is_active,
          lastSeen: r.last_seen,
          lastSync: r.last_sync,
          version: r.version,
          queueCount: r.queue_count,
          createdAt: r.created_at,
        };
      }
    } catch {}
  }
  return memoryStore.rooms.find((r) => r.id === id || r.code === id) || null;
}

export async function findRoomByApiKey(apiKey: string): Promise<Room | null> {
  const hash = hashApiKey(apiKey);
  if (pool) {
    try {
      const res = await pool.query('SELECT * FROM rooms WHERE api_key_hash = $1', [hash]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          name: r.name,
          code: r.code,
          capacity: r.capacity,
          description: r.description,
          apiKeyHash: r.api_key_hash,
          isActive: r.is_active,
          lastSeen: r.last_seen,
          lastSync: r.last_sync,
          version: r.version,
          queueCount: r.queue_count,
          createdAt: r.created_at,
        };
      }
    } catch {}
  }
  return memoryStore.rooms.find((r) => r.apiKeyHash === hash) || null;
}

export async function createRoom(data: Omit<Room, 'id' | 'createdAt' | 'apiKeyHash' | 'queueCount'> & { apiKey: string }): Promise<Room> {
  const newRoom: Room = {
    id: data.code,
    name: data.name,
    code: data.code,
    capacity: data.capacity,
    description: data.description,
    apiKeyHash: hashApiKey(data.apiKey),
    isActive: data.isActive !== false,
    queueCount: 0,
    createdAt: new Date().toISOString(),
  };

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO rooms (id, name, code, capacity, description, api_key_hash, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newRoom.id, newRoom.name, newRoom.code, newRoom.capacity, newRoom.description, newRoom.apiKeyHash, newRoom.isActive, newRoom.createdAt]
      );
      return newRoom;
    } catch (err) {
      console.error('[createRoom DB Error]', err);
    }
  }

  memoryStore.rooms.push(newRoom);
  return newRoom;
}

export async function updateRoom(id: string, data: Partial<Room>): Promise<Room | null> {
  const existing = await getRoomById(id);
  if (!existing) return null;
  const updated: Room = { ...existing, ...data };

  if (pool) {
    try {
      await pool.query(
        `UPDATE rooms SET name = $1, capacity = $2, description = $3, is_active = $4 WHERE id = $5`,
        [updated.name, updated.capacity, updated.description, updated.isActive, id]
      );
      return updated;
    } catch {}
  }

  const idx = memoryStore.rooms.findIndex((r) => r.id === id);
  if (idx !== -1) memoryStore.rooms[idx] = updated;
  return updated;
}

export async function deleteRoom(id: string): Promise<boolean> {
  if (pool) {
    try {
      await pool.query('DELETE FROM rooms WHERE id = $1', [id]);
      return true;
    } catch {}
  }
  const idx = memoryStore.rooms.findIndex((r) => r.id === id);
  if (idx !== -1) {
    memoryStore.rooms.splice(idx, 1);
    return true;
  }
  return false;
}

export async function updateRoomHeartbeat(roomId: string, data: { version?: string; queueCount?: number; lastSync?: string }): Promise<void> {
  const nowStr = new Date().toISOString();
  if (pool) {
    try {
      await pool.query(
        `UPDATE rooms SET last_seen = $1, version = COALESCE($2, version), queue_count = COALESCE($3, queue_count), last_sync = COALESCE($4, last_sync) WHERE id = $5`,
        [nowStr, data.version || null, data.queueCount ?? null, data.lastSync || null, roomId]
      );
      return;
    } catch {}
  }

  const r = memoryStore.rooms.find((room) => room.id === roomId || room.code === roomId);
  if (r) {
    r.lastSeen = nowStr;
    if (data.version) r.version = data.version;
    if (data.queueCount !== undefined) r.queueCount = data.queueCount;
    if (data.lastSync) r.lastSync = data.lastSync;
  }
}

export async function listEquipment(roomId?: string): Promise<Equipment[]> {
  if (pool) {
    try {
      const q = roomId ? 'SELECT * FROM equipment WHERE room_id = $1' : 'SELECT * FROM equipment';
      const p = roomId ? [roomId] : [];
      const res = await pool.query(q, p);
      return res.rows.map((r) => ({
        id: r.id,
        roomId: r.room_id,
        name: r.name,
        code: r.code,
        isAvailable: r.is_available,
        createdAt: r.created_at,
      }));
    } catch {}
  }
  return roomId ? memoryStore.equipment.filter((e) => e.roomId === roomId) : [...memoryStore.equipment];
}

export async function listCards(userId?: string): Promise<Card[]> {
  if (pool) {
    try {
      const q = userId
        ? `SELECT c.*, u.name as user_name, u.role as user_role FROM cards c JOIN users u ON c.user_id = u.id WHERE c.user_id = $1`
        : `SELECT c.*, u.name as user_name, u.role as user_role FROM cards c JOIN users u ON c.user_id = u.id`;
      const p = userId ? [userId] : [];
      const res = await pool.query(q, p);
      return res.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        uidHash: r.uid_hash,
        label: r.label,
        isActive: r.is_active,
        createdAt: r.created_at,
        userName: r.user_name,
        userRole: r.user_role,
      }));
    } catch {}
  }
  return userId ? memoryStore.cards.filter((c) => c.userId === userId) : [...memoryStore.cards];
}

export async function createCard(data: { userId: string; rawUid: string; label: string }): Promise<Card> {
  const uidHash = hashCardUid(data.rawUid);
  const user = await findUserById(data.userId);
  const newCard: Card = {
    id: `crd_${Date.now()}`,
    userId: data.userId,
    uidHash,
    label: data.label,
    isActive: true,
    createdAt: new Date().toISOString(),
    userName: user?.name,
    userRole: user?.role,
  };

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO cards (id, user_id, uid_hash, label, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [newCard.id, newCard.userId, newCard.uidHash, newCard.label, newCard.isActive, newCard.createdAt]
      );
      return newCard;
    } catch {}
  }

  memoryStore.cards.push(newCard);
  return newCard;
}

export async function deleteCard(cardId: string): Promise<boolean> {
  if (pool) {
    try {
      await pool.query('DELETE FROM cards WHERE id = $1', [cardId]);
      return true;
    } catch {}
  }
  const idx = memoryStore.cards.findIndex((c) => c.id === cardId);
  if (idx !== -1) {
    memoryStore.cards.splice(idx, 1);
    return true;
  }
  return false;
}

export async function checkBookingConflict(
  roomId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<{ hasConflict: boolean; conflictingBooking?: Booking }> {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (pool) {
    try {
      const q = excludeBookingId
        ? `SELECT * FROM bookings WHERE room_id = $1 AND status IN ('menunggu', 'disetujui') AND id != $2 AND tstzrange(start_time, end_time) && tstzrange($3, $4)`
        : `SELECT * FROM bookings WHERE room_id = $1 AND status IN ('menunggu', 'disetujui') AND tstzrange(start_time, end_time) && tstzrange($2, $3)`;
      const p = excludeBookingId ? [roomId, excludeBookingId, startTime, endTime] : [roomId, startTime, endTime];
      const res = await pool.query(q, p);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          hasConflict: true,
          conflictingBooking: {
            id: r.id,
            userId: r.user_id,
            roomId: r.room_id,
            purpose: r.purpose,
            startTime: r.start_time,
            endTime: r.end_time,
            status: r.status,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          },
        };
      }
      return { hasConflict: false };
    } catch {}
  }

  // Memory fallback check
  const conflict = memoryStore.bookings.find((b) => {
    if (b.roomId !== roomId) return false;
    if (b.status !== 'menunggu' && b.status !== 'disetujui') return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    const bStart = new Date(b.startTime).getTime();
    const bEnd = new Date(b.endTime).getTime();
    return Math.max(start, bStart) < Math.min(end, bEnd);
  });

  return {
    hasConflict: !!conflict,
    conflictingBooking: conflict,
  };
}

export async function createBooking(data: {
  userId: string;
  roomId: string;
  equipmentId?: string | null;
  purpose: string;
  startTime: string;
  endTime: string;
}): Promise<Booking> {
  const user = await findUserById(data.userId);
  const room = await getRoomById(data.roomId);
  const eq = data.equipmentId ? (await listEquipment(data.roomId)).find((e) => e.id === data.equipmentId) : null;

  const newBooking: Booking = {
    id: `bkg_${Date.now()}`,
    userId: data.userId,
    userName: user?.name,
    roomId: data.roomId,
    roomName: room?.name,
    roomCode: room?.code,
    equipmentId: data.equipmentId || null,
    equipmentName: eq?.name || null,
    purpose: data.purpose,
    startTime: data.startTime,
    endTime: data.endTime,
    status: 'menunggu',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO bookings (id, user_id, room_id, equipment_id, purpose, start_time, end_time, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [newBooking.id, newBooking.userId, newBooking.roomId, newBooking.equipmentId, newBooking.purpose, newBooking.startTime, newBooking.endTime, newBooking.status, newBooking.createdAt, newBooking.updatedAt]
      );
      return newBooking;
    } catch {}
  }

  memoryStore.bookings.push(newBooking);
  return newBooking;
}

export async function listBookings(filter?: { userId?: string; roomId?: string; status?: BookingStatus }): Promise<Booking[]> {
  if (pool) {
    try {
      let query = `
        SELECT b.*, u.name as user_name, r.name as room_name, r.code as room_code, e.name as equipment_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN rooms r ON b.room_id = r.id
        LEFT JOIN equipment e ON b.equipment_id = e.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (filter?.userId) {
        params.push(filter.userId);
        query += ` AND b.user_id = $${params.length}`;
      }
      if (filter?.roomId) {
        params.push(filter.roomId);
        query += ` AND b.room_id = $${params.length}`;
      }
      if (filter?.status) {
        params.push(filter.status);
        query += ` AND b.status = $${params.length}`;
      }
      query += ` ORDER BY b.start_time DESC`;
      const res = await pool.query(query, params);
      return res.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        roomId: r.room_id,
        roomName: r.room_name,
        roomCode: r.room_code,
        equipmentId: r.equipment_id,
        equipmentName: r.equipment_name,
        purpose: r.purpose,
        startTime: r.start_time,
        endTime: r.end_time,
        status: r.status,
        rejectionReason: r.rejection_reason,
        qrToken: r.qr_token,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch {}
  }

  let list = [...memoryStore.bookings];
  if (filter?.userId) list = list.filter((b) => b.userId === filter.userId);
  if (filter?.roomId) list = list.filter((b) => b.roomId === filter.roomId);
  if (filter?.status) list = list.filter((b) => b.status === filter.status);
  return list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const all = await listBookings();
  return all.find((b) => b.id === id) || null;
}

export async function updateBooking(id: string, data: { purpose?: string; startTime?: string; endTime?: string }): Promise<Booking | null> {
  const existing = await getBookingById(id);
  if (!existing) return null;
  if (existing.status !== 'menunggu') return null; // Hanya yang menunggu yang bisa diubah

  const updated: Booking = {
    ...existing,
    purpose: data.purpose ?? existing.purpose,
    startTime: data.startTime ?? existing.startTime,
    endTime: data.endTime ?? existing.endTime,
    updatedAt: new Date().toISOString(),
  };

  if (pool) {
    try {
      await pool.query(
        `UPDATE bookings SET purpose = $1, start_time = $2, end_time = $3, updated_at = $4 WHERE id = $5 AND status = 'menunggu'`,
        [updated.purpose, updated.startTime, updated.endTime, updated.updatedAt, id]
      );
      return updated;
    } catch {}
  }

  const idx = memoryStore.bookings.findIndex((b) => b.id === id);
  if (idx !== -1) memoryStore.bookings[idx] = updated;
  return updated;
}

export async function cancelBooking(id: string, userId: string, role: string): Promise<Booking | null> {
  const existing = await getBookingById(id);
  if (!existing) return null;
  if (role !== 'admin' && role !== 'dosen' && existing.userId !== userId) {
    return null;
  }

  const updated: Booking = {
    ...existing,
    status: 'dibatalkan',
    updatedAt: new Date().toISOString(),
  };

  if (pool) {
    try {
      await pool.query(`UPDATE bookings SET status = 'dibatalkan', updated_at = $1 WHERE id = $2`, [updated.updatedAt, id]);
      return updated;
    } catch {}
  }

  const idx = memoryStore.bookings.findIndex((b) => b.id === id);
  if (idx !== -1) memoryStore.bookings[idx] = updated;
  return updated;
}

export async function approveOrRejectBooking(
  id: string,
  decision: 'disetujui' | 'ditolak',
  rejectionReason?: string
): Promise<Booking | null> {
  const existing = await getBookingById(id);
  if (!existing) return null;

  let qrToken: string | null = null;
  if (decision === 'disetujui') {
    qrToken = await signQrTicket({
      bookingId: existing.id,
      roomId: existing.roomId,
      roomCode: existing.roomCode || existing.roomId,
      userId: existing.userId,
      userName: existing.userName || 'Mahasiswa Undip',
      startTime: existing.startTime,
      endTime: existing.endTime,
    });
  }

  const updated: Booking = {
    ...existing,
    status: decision,
    rejectionReason: decision === 'ditolak' ? (rejectionReason || 'Ditolak oleh dosen/admin') : null,
    qrToken,
    updatedAt: new Date().toISOString(),
  };

  if (pool) {
    try {
      await pool.query(
        `UPDATE bookings SET status = $1, rejection_reason = $2, qr_token = $3, updated_at = $4 WHERE id = $5`,
        [updated.status, updated.rejectionReason, updated.qrToken, updated.updatedAt, id]
      );
      return updated;
    } catch {}
  }

  const idx = memoryStore.bookings.findIndex((b) => b.id === id);
  if (idx !== -1) memoryStore.bookings[idx] = updated;
  return updated;
}

export async function insertAccessLogs(logs: Omit<AccessLog, 'id' | 'createdAt'>[]): Promise<{ acceptedCount: number; acceptedEventIds: string[] }> {
  const acceptedIds: string[] = [];

  for (const log of logs) {
    if (pool) {
      try {
        const res = await pool.query(
          `INSERT INTO access_logs (id, event_id, room_id, user_id, method, identifier, result, reason, user_name, timestamp, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
           ON CONFLICT (event_id) DO NOTHING
           RETURNING event_id`,
          [
            `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            log.eventId,
            log.roomId,
            log.userId || null,
            log.method,
            log.identifier,
            log.result,
            log.reason || null,
            log.userName || null,
            log.timestamp,
          ]
        );
        if (res.rowCount && res.rowCount > 0) {
          acceptedIds.push(log.eventId);
        } else {
          // Idempoten: sudah ada, tetap dianggap berhasil diproses
          acceptedIds.push(log.eventId);
        }
        continue;
      } catch {}
    }

    // Memory Store idempotent insert
    const exists = memoryStore.accessLogs.some((l) => l.eventId === log.eventId);
    if (!exists) {
      memoryStore.accessLogs.unshift({
        ...log,
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
      });
    }
    acceptedIds.push(log.eventId);
  }

  return { acceptedCount: acceptedIds.length, acceptedEventIds: acceptedIds };
}

export async function listAccessLogs(filter?: { roomId?: string; method?: string; result?: string }): Promise<AccessLog[]> {
  if (pool) {
    try {
      let q = `SELECT * FROM access_logs WHERE 1=1`;
      const p: any[] = [];
      if (filter?.roomId) {
        p.push(filter.roomId);
        q += ` AND room_id = $${p.length}`;
      }
      if (filter?.method) {
        p.push(filter.method);
        q += ` AND method = $${p.length}`;
      }
      if (filter?.result) {
        p.push(filter.result);
        q += ` AND result = $${p.length}`;
      }
      q += ` ORDER BY timestamp DESC LIMIT 200`;
      const res = await pool.query(q, p);
      return res.rows.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        roomId: r.room_id,
        userId: r.user_id,
        method: r.method,
        identifier: r.identifier,
        result: r.result,
        reason: r.reason,
        userName: r.user_name,
        timestamp: r.timestamp,
        createdAt: r.created_at,
      }));
    } catch {}
  }

  let list = [...memoryStore.accessLogs];
  if (filter?.roomId) list = list.filter((l) => l.roomId === filter.roomId);
  if (filter?.method) list = list.filter((l) => l.method === filter.method);
  if (filter?.result) list = list.filter((l) => l.result === filter.result);
  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function createGatewayCommand(roomId: string, action: 'remote_unlock' | 'force_sync', payload: any = {}): Promise<GatewayCommand> {
  const expiresAt = new Date(Date.now() + 60000).toISOString(); // Berlaku 60 detik
  const cmd: GatewayCommand = {
    id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    roomId,
    action,
    payload,
    status: 'pending',
    expiresAt,
    createdAt: new Date().toISOString(),
  };

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO gateway_commands (id, room_id, action, payload, status, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [cmd.id, cmd.roomId, cmd.action, JSON.stringify(cmd.payload), cmd.status, cmd.expiresAt, cmd.createdAt]
      );
      return cmd;
    } catch {}
  }

  memoryStore.commands.push(cmd);
  return cmd;
}

export async function getPendingCommands(roomId: string): Promise<GatewayCommand[]> {
  const nowStr = new Date().toISOString();
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT * FROM gateway_commands WHERE room_id = $1 AND status = 'pending' AND expires_at > $2 ORDER BY created_at ASC`,
        [roomId, nowStr]
      );
      return res.rows.map((r) => ({
        id: r.id,
        roomId: r.room_id,
        action: r.action,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
        status: r.status,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
      }));
    } catch {}
  }

  return memoryStore.commands.filter(
    (c) => c.roomId === roomId && c.status === 'pending' && new Date(c.expiresAt).getTime() > Date.now()
  );
}

export async function deleteGatewayCommand(id: string, roomId?: string): Promise<boolean> {
  if (pool) {
    try {
      const q = roomId
        ? 'DELETE FROM gateway_commands WHERE id = $1 AND room_id = $2'
        : 'DELETE FROM gateway_commands WHERE id = $1';
      const p = roomId ? [id, roomId] : [id];
      const res = await pool.query(q, p);
      return (res.rowCount ?? 0) > 0;
    } catch {}
  }

  const idx = memoryStore.commands.findIndex((c) => c.id === id && (!roomId || c.roomId === roomId));
  if (idx !== -1) {
    memoryStore.commands.splice(idx, 1);
    return true;
  }
  return false;
}
