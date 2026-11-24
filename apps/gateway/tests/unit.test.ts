import { describe, it, expect } from 'vitest';
import { evaluateAccess, hashCardUid, DecisionContext } from '../src/decisionEngine';
import { CachedBooking } from '../src/types';
import * as jose from 'jose';
import crypto from 'crypto';

describe('Gateway Service 2 Decision Engine Unit Tests', () => {
  const PEPPER = 'labgate_undip_tembalang_secure_pepper_2026';
  const VALID_UID = '01020304';
  const VALID_UID_HASH = hashCardUid(VALID_UID, PEPPER);

  const mockBookings: CachedBooking[] = [
    {
      id: 'bkg_test_01',
      userId: 'usr_mhs_01',
      userName: 'Muhammad Isya Asyhari',
      roomCode: 'lab-01',
      startTime: '2026-11-24T10:00:00.000Z',
      endTime: '2026-11-24T12:00:00.000Z',
      status: 'disetujui',
      cardUidHashes: [VALID_UID_HASH],
    },
    {
      id: 'bkg_other_room_02',
      userId: 'usr_mhs_02',
      userName: 'Nabila Putri',
      roomCode: 'lab-02', // Ruangan Berbeda!
      startTime: '2026-11-24T10:00:00.000Z',
      endTime: '2026-11-24T12:00:00.000Z',
      status: 'disetujui',
      cardUidHashes: [hashCardUid('05060708', PEPPER)],
    },
  ];

  const baseContext: DecisionContext = {
    roomCode: 'lab-01',
    cachedBookings: mockBookings,
    lastSyncTime: new Date('2026-11-24T09:00:00.000Z'),
    maxCacheAgeHours: 24,
    pepper: PEPPER,
    emergencyPin: '1722',
  };

  it('AKSES_DITERIMA: Membuka pintu jika kartu terdaftar, booking disetujui, dan dalam toleransi waktu', async () => {
    // Tepat pada rentang waktu (10.30)
    const ctx: DecisionContext = {
      ...baseContext,
      currentTime: new Date('2026-11-24T10:30:00.000Z'),
    };

    const res = await evaluateAccess('rfid', VALID_UID, ctx);
    expect(res.action).toBe('open');
    expect(res.code).toBe('AKSES_DITERIMA');
    expect(res.name).toBe('Muhammad Isya As');
    expect(res.holdMs).toBe(5000);
    expect(res.remainingMinutes).toBe(90);
  });

  it('AKSES_DITERIMA: Membuka pintu pada toleransi 10 menit sebelum jam mulai', async () => {
    // 09.52 (8 menit sebelum jam 10.00 -> Masuk batas toleransi 10 menit)
    const ctx: DecisionContext = {
      ...baseContext,
      currentTime: new Date('2026-11-24T09:52:00.000Z'),
    };

    const res = await evaluateAccess('rfid', VALID_UID, ctx);
    expect(res.action).toBe('open');
    expect(res.code).toBe('AKSES_DITERIMA');
  });

  it('AKSES_DITERIMA: Membuka pintu pada toleransi 5 menit setelah jam selesai', async () => {
    // 12.04 (4 menit setelah jam 12.00 -> Masuk batas toleransi 5 menit)
    const ctx: DecisionContext = {
      ...baseContext,
      currentTime: new Date('2026-11-24T12:04:00.000Z'),
    };

    const res = await evaluateAccess('rfid', VALID_UID, ctx);
    expect(res.action).toBe('open');
    expect(res.code).toBe('AKSES_DITERIMA');
  });

  it('KARTU_TIDAK_DIKENAL: Menolak kartu yang tidak terdaftar di database', async () => {
    const ctx: DecisionContext = {
      ...baseContext,
      currentTime: new Date('2026-11-24T10:30:00.000Z'),
    };

    const res = await evaluateAccess('rfid', 'ffffffff', ctx);
    expect(res.action).toBe('deny');
    expect(res.code).toBe('KARTU_TIDAK_DIKENAL');
    expect(res.reason).toBe('Kartu tak dikenal');
  });

  it('TIDAK_ADA_BOOKING: Menolak jika kartu terdaftar untuk lab-02 tapi ditempel di lab-01', async () => {
    const ctx: DecisionContext = {
      ...baseContext,
      currentTime: new Date('2026-11-24T10:30:00.000Z'),
    };

    const res = await evaluateAccess('rfid', '05060708', ctx);
    expect(res.action).toBe('deny');
    expect(res.code).toBe('TIDAK_ADA_BOOKING');
    expect(res.reason).toBe('Tak ada booking');
  });

  it('DI_LUAR_JADWAL: Menolak jika waktu tap lebih dari 10 menit sebelum jam mulai', async () => {
    // 09.40 (20 menit sebelum jam 10.00)
    const ctx: DecisionContext = {
      ...baseContext,
      currentTime: new Date('2026-11-24T09:40:00.000Z'),
    };

    const res = await evaluateAccess('rfid', VALID_UID, ctx);
    expect(res.action).toBe('deny');
    expect(res.code).toBe('DI_LUAR_JADWAL');
    expect(res.reason).toBe('Di luar jadwal');
  });

  it('CACHE_KEDALUWARSA: Menolak jika cache gateway melebihi batas waktu (24 jam)', async () => {
    const oldSync = new Date('2026-11-20T10:00:00.000Z'); // 4 hari lalu
    const ctx: DecisionContext = {
      ...baseContext,
      lastSyncTime: oldSync,
      currentTime: new Date('2026-11-24T10:30:00.000Z'),
    };

    const res = await evaluateAccess('rfid', VALID_UID, ctx);
    expect(res.action).toBe('deny');
    expect(res.code).toBe('CACHE_KEDALUWARSA');
    expect(res.reason).toBe('Cache kedaluwarsa');
  });

  describe('Emergency PIN Override', () => {
    it('membuka pintu darurat dengan PIN 1722', async () => {
      const res = await evaluateAccess('manual_pin', '1722', baseContext);
      expect(res.action).toBe('open');
      expect(res.name).toBe('Petugas Piket');
    });

    it('menolak pembukaan darurat jika PIN salah', async () => {
      const res = await evaluateAccess('manual_pin', '0000', baseContext);
      expect(res.action).toBe('deny');
      expect(res.code).toBe('PIN_SALAH');
    });
  });

  describe('Offline QR Ticket Verification', () => {
    it('memvalidasi tiket QR bertanda tangan Ed25519 menggunakan kunci publik yang di-cache', async () => {
      // Buat pasangan kunci Ed25519 untuk testing
      const keyPair = crypto.generateKeyPairSync('ed25519', {
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      });

      const privateKey = await jose.importPKCS8(keyPair.privateKey, 'EdDSA');

      const qrToken = await new jose.SignJWT({
        bid: 'bkg_qr_test',
        rc: 'lab-01',
        un: 'Muhammad Isya Asyhari',
        st: '2026-11-24T10:00:00.000Z',
        et: '2026-11-24T12:00:00.000Z',
      })
        .setProtectedHeader({ alg: 'EdDSA' })
        .setExpirationTime('2h')
        .sign(privateKey);

      const ctx: DecisionContext = {
        ...baseContext,
        cachedPublicKey: keyPair.publicKey,
        currentTime: new Date('2026-11-24T10:30:00.000Z'),
      };

      const res = await evaluateAccess('qr', qrToken, ctx);
      expect(res.action).toBe('open');
      expect(res.name).toBe('Muhammad Isya As');
      expect(res.remainingMinutes).toBe(90);
    });
  });
});
