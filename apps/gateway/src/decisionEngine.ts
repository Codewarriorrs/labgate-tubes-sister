import crypto from 'crypto';
import * as jose from 'jose';
import { DecisionResult, CachedBooking } from './types';

export interface DecisionContext {
  roomCode: string;
  currentTime?: Date;
  cachedBookings: CachedBooking[];
  cachedPublicKey?: string | null;
  lastSyncTime?: Date | null;
  maxCacheAgeHours?: number; // default 24 jam
  pepper?: string;
  emergencyPin?: string; // default 1722
}

/**
 * Hash UID kartu RFID menggunakan SHA-256 dan pepper
 */
export function hashCardUid(uid: string, pepper: string = 'labgate_undip_tembalang_secure_pepper_2026'): string {
  const normalized = uid.toLowerCase().trim();
  return crypto.createHash('sha256').update(normalized + pepper).digest('hex');
}

/**
 * Mesin Keputusan Murni (Pure Function)
 * Menentukan hak akses masuk pintu berdasarkan aturan bisnis dan toleransi waktu
 */
export async function evaluateAccess(
  method: 'rfid' | 'qr' | 'manual_pin',
  payload: string,
  context: DecisionContext
): Promise<DecisionResult> {
  const now = context.currentTime || new Date();
  const maxAgeHours = context.maxCacheAgeHours ?? 24;
  const emergencyPin = context.emergencyPin || '1722';
  const pepper = context.pepper || 'labgate_undip_tembalang_secure_pepper_2026';

  // 1. Evaluasi Metode Emergency Manual PIN (Petugas Piket override selalu diprioritaskan)
  if (method === 'manual_pin') {
    if (payload.trim() === emergencyPin) {
      return {
        action: 'open',
        code: 'AKSES_DITERIMA',
        name: 'Petugas Piket',
        holdMs: 5000,
      };
    } else {
      return {
        action: 'deny',
        code: 'PIN_SALAH',
        reason: 'PIN darurat salah',
      };
    }
  }

  // 2. Cek Kedaluwarsa Cache Gateway (Batas default 24 jam)
  if (context.lastSyncTime) {
    const ageMs = now.getTime() - context.lastSyncTime.getTime();
    if (ageMs > maxAgeHours * 3600 * 1000) {
      return {
        action: 'deny',
        code: 'CACHE_KEDALUWARSA',
        reason: 'Cache kedaluwarsa',
      };
    }
  }

  // 3. Evaluasi Metode RFID (Kartu Mahasiswa / Dosen)
  if (method === 'rfid') {
    const incomingUidHash = hashCardUid(payload, pepper);

    // Cari apakah hash kartu terdaftar pada booking yang tersimpan di cache
    const userBookings = context.cachedBookings.filter((b) =>
      b.cardUidHashes && b.cardUidHashes.includes(incomingUidHash)
    );

    if (userBookings.length === 0) {
      return {
        action: 'deny',
        code: 'KARTU_TIDAK_DIKENAL',
        reason: 'Kartu tak dikenal',
      };
    }

    // Cari booking yang disetujui untuk ruangan spesifik ini
    const roomBookings = userBookings.filter(
      (b) => b.roomCode.toLowerCase() === context.roomCode.toLowerCase() && b.status === 'disetujui'
    );

    if (roomBookings.length === 0) {
      return {
        action: 'deny',
        code: 'TIDAK_ADA_BOOKING',
        reason: 'Tak ada booking',
      };
    }

    // Evaluasi toleransi jendela waktu [mulai - 10 menit, selesai + 5 menit]
    for (const bkg of roomBookings) {
      const startMs = new Date(bkg.startTime).getTime() - 10 * 60 * 1000; // -10 menit
      const endMs = new Date(bkg.endTime).getTime() + 5 * 60 * 1000;     // +5 menit
      const nowMs = now.getTime();

      if (nowMs >= startMs && nowMs <= endMs) {
        const remainingMinutes = Math.max(
          0,
          Math.round((new Date(bkg.endTime).getTime() - nowMs) / 60000)
        );
        const displayName = bkg.userName.substring(0, 16);

        return {
          action: 'open',
          code: 'AKSES_DITERIMA',
          name: displayName,
          holdMs: 5000,
          bookingId: bkg.id,
          remainingMinutes,
        };
      }
    }

    // Jika ada booking untuk ruangan ini tapi di luar toleransi waktu
    return {
      action: 'deny',
      code: 'DI_LUAR_JADWAL',
      reason: 'Di luar jadwal',
    };
  }

  // 4. Evaluasi Tiket QR (Token Bertanda Tangan Ed25519)
  if (method === 'qr') {
    if (!context.cachedPublicKey) {
      return {
        action: 'deny',
        code: 'TIKET_QR_TIDAK_VALID',
        reason: 'Key offline nihil',
      };
    }

    try {
      const importedKey = await jose.importSPKI(context.cachedPublicKey, 'EdDSA');
      const { payload: jwtPayload } = await jose.jwtVerify(payload, importedKey);

      const targetRoomCode = (jwtPayload.rc as string) || '';
      if (targetRoomCode.toLowerCase() !== context.roomCode.toLowerCase()) {
        return {
          action: 'deny',
          code: 'TIDAK_ADA_BOOKING',
          reason: 'Salah ruangan',
        };
      }

      const st = new Date(jwtPayload.st as string).getTime() - 10 * 60 * 1000;
      const et = new Date(jwtPayload.et as string).getTime() + 5 * 60 * 1000;
      const nowMs = now.getTime();

      if (nowMs < st || nowMs > et) {
        return {
          action: 'deny',
          code: 'DI_LUAR_JADWAL',
          reason: 'Di luar jadwal',
        };
      }

      const userName = (jwtPayload.un as string) || 'Mahasiswa';
      const remainingMinutes = Math.max(
        0,
        Math.round((new Date(jwtPayload.et as string).getTime() - nowMs) / 60000)
      );

      return {
        action: 'open',
        code: 'AKSES_DITERIMA',
        name: userName.substring(0, 16),
        holdMs: 5000,
        bookingId: jwtPayload.bid as string,
        remainingMinutes,
      };
    } catch {
      return {
        action: 'deny',
        code: 'TIKET_QR_TIDAK_VALID',
        reason: 'QR tidak valid',
      };
    }
  }

  return {
    action: 'deny',
    code: 'KARTU_TIDAK_DIKENAL',
    reason: 'Metode tak dikenal',
  };
}
