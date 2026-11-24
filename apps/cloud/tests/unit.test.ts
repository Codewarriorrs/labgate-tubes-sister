import { describe, it, expect } from 'vitest';
import { checkBookingConflict, insertAccessLogs, createGatewayCommand, getPendingCommands } from '../lib/db';
import { signQrTicket, verifyQrTicket } from '../lib/crypto';

describe('Cloud Service 1 Unit Tests', () => {
  describe('Pencegahan Booking Bentrok (Conflict Detection)', () => {
    it('mendeteksi bentrok jadwal yang tumpang tindih pada ruangan yang sama', async () => {
      // lab-01 memiliki booking aktif hari ini (bkg_aktif_01)
      const now = new Date();
      const overlapStart = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
      const overlapEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

      const result = await checkBookingConflict('lab-01', overlapStart, overlapEnd);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictingBooking).toBeDefined();
    });

    it('mengizinkan booking pada jadwal yang tidak bertabrakan', async () => {
      // Jadwal tahun depan
      const futureStart = '2027-01-15T10:00:00.000Z';
      const futureEnd = '2027-01-15T12:00:00.000Z';

      const result = await checkBookingConflict('lab-01', futureStart, futureEnd);
      expect(result.hasConflict).toBe(false);
    });
  });

  describe('Idempotensi POST /logs', () => {
    it('memproses eventId yang sama berulang kali tanpa membuat duplikasi', async () => {
      const fixedEventId = 'test-event-uuid-idempotent-001';
      const logs = [
        {
          eventId: fixedEventId,
          roomId: 'lab-01',
          method: 'rfid' as const,
          identifier: '01020304',
          result: 'granted' as const,
          reason: null,
          userName: 'Muhammad Isya Asyhari',
          timestamp: new Date().toISOString(),
        },
      ];

      // Insert pertama
      const res1 = await insertAccessLogs(logs);
      expect(res1.acceptedEventIds).toContain(fixedEventId);

      // Insert kedua dengan eventId identik
      const res2 = await insertAccessLogs(logs);
      expect(res2.acceptedEventIds).toContain(fixedEventId);
    });
  });

  describe('Verifikasi Tiket Kriptografi Ed25519', () => {
    it('berhasil memverifikasi token bertanda tangan sah', async () => {
      const now = Date.now();
      const payload = {
        bookingId: 'bkg_unit_test_01',
        roomId: 'lab-01',
        roomCode: 'lab-01',
        userId: 'usr_mhs_01',
        userName: 'Muhammad Isya Asyhari',
        startTime: new Date(now - 1000).toISOString(),
        endTime: new Date(now + 7200 * 1000).toISOString(),
      };

      const token = await signQrTicket(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const verified = await verifyQrTicket(token);
      expect(verified).not.toBeNull();
      expect(verified?.bookingId).toBe('bkg_unit_test_01');
      expect(verified?.roomCode).toBe('lab-01');
      expect(verified?.userName).toBe('Muhammad Isya Asyhari');
    });

    it('menolak token palsu atau tanda tangan yang diubah', async () => {
      const fakeToken = 'eyJhbGciOiJFZERTQSI...fake.signature...';
      const verified = await verifyQrTicket(fakeToken);
      expect(verified).toBeNull();
    });
  });

  describe('Kedaluwarsa Perintah Gateway', () => {
    it('hanya mengambil perintah yang belum kedaluwarsa (< 60 detik)', async () => {
      const cmd = await createGatewayCommand('lab-01', 'remote_unlock', { operator: 'Tester' });
      expect(cmd.id).toBeDefined();

      const pending = await getPendingCommands('lab-01');
      const found = pending.find((c) => c.id === cmd.id);
      expect(found).toBeDefined();
    });
  });
});
