import { NextRequest, NextResponse } from 'next/server';
import {
  listRooms,
  listCards,
  listBookings,
  insertAccessLogs,
  updateRoomHeartbeat,
  getPendingCommands,
  deleteGatewayCommand,
} from '@/lib/db';
import { hashCardUid, verifyQrTicket } from '@/lib/crypto';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gate/verify?room=lab-01
 * Endpoint langsung untuk ESP32 (tanpa Gateway terpisah):
 * Memperbarui status online gate dan mengecek perintah Remote Unlock dari Web Cloud.
 */
export async function GET(req: NextRequest) {
  try {
    const roomCode = req.nextUrl.searchParams.get('room') || 'lab-01';
    const rooms = await listRooms();
    const room = rooms.find((r) => r.code.toLowerCase() === roomCode.toLowerCase());

    if (!room) {
      return NextResponse.json({ action: 'idle', error: 'Ruangan tidak ditemukan' }, { status: 404 });
    }

    await updateRoomHeartbeat(room.id, {
      version: 'esp32-direct-1.0',
      queueCount: 0,
      lastSync: new Date().toISOString(),
    });

    const commands = await getPendingCommands(room.id);
    const unlockCmd = commands.find((c) => c.action === 'remote_unlock');
    if (unlockCmd) {
      await deleteGatewayCommand(unlockCmd.id, room.id);
      return NextResponse.json({
        action: 'open',
        name: 'Remote Admin',
        holdMs: 5000,
      });
    }

    return NextResponse.json({ action: 'idle' });
  } catch (err: any) {
    console.error('[GET /api/gate/verify Error]', err);
    return NextResponse.json({ action: 'idle', error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/gate/verify
 * Verifikasi langsung dari ESP32 ke Cloud (tanpa perantara Edge Gateway).
 * Body: { room: string, method: "rfid" | "manual_pin", uid: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const roomCode = String(body.room || 'lab-01').trim();
    const method = String(body.method || 'rfid').trim() as 'rfid' | 'qr' | 'manual_pin';
    const rawUid = String(body.uid || body.token || '').trim();

    const rooms = await listRooms();
    const room = rooms.find((r) => r.code.toLowerCase() === roomCode.toLowerCase());

    if (!room) {
      return NextResponse.json({ action: 'deny', reason: 'Lab tdk ada' }, { status: 404 });
    }

    await updateRoomHeartbeat(room.id, {
      version: 'esp32-direct-1.0',
      queueCount: 0,
      lastSync: new Date().toISOString(),
    });

    const now = new Date();
    const eventId = `evt_${crypto.randomUUID().slice(0, 12)}`;

    // 1. Verifikasi PIN Darurat
    if (method === 'manual_pin') {
      const emergencyPin = process.env.EMERGENCY_PIN || '1722';
      if (rawUid === emergencyPin) {
        await insertAccessLogs([
          {
            eventId,
            roomId: room.id,
            method: 'manual_pin',
            identifier: 'PIN_DARURAT',
            userName: 'Petugas Piket',
            result: 'granted',
            reason: 'PIN Darurat Terverifikasi (Direct ESP32)',
            timestamp: now.toISOString(),
          },
        ]);
        return NextResponse.json({
          action: 'open',
          name: 'Petugas Piket',
          holdMs: 5000,
        });
      }

      await insertAccessLogs([
        {
          eventId,
          roomId: room.id,
          method: 'manual_pin',
          identifier: 'PIN_SALAH',
          result: 'denied',
          reason: 'PIN Darurat Salah',
          timestamp: now.toISOString(),
        },
      ]);
      return NextResponse.json({ action: 'deny', reason: 'PIN Salah' });
    }

    // 1b. Verifikasi Tiket QR (Ed25519)
    if (method === 'qr') {
      const qrPayload = await verifyQrTicket(rawUid);
      if (!qrPayload) {
        await insertAccessLogs([
          {
            eventId,
            roomId: room.id,
            method: 'qr',
            identifier: rawUid.slice(0, 24),
            result: 'denied',
            reason: 'Tiket QR tidak valid atau kedaluwarsa',
            timestamp: now.toISOString(),
          },
        ]);
        return NextResponse.json({ action: 'deny', reason: 'QR tidak valid' });
      }

      if (qrPayload.roomCode.toLowerCase() !== room.code.toLowerCase()) {
        await insertAccessLogs([
          {
            eventId,
            roomId: room.id,
            userId: qrPayload.userId,
            userName: qrPayload.userName,
            method: 'qr',
            identifier: qrPayload.bookingId,
            result: 'denied',
            reason: `Tiket QR untuk ruangan ${qrPayload.roomCode}, bukan ${room.code}`,
            timestamp: now.toISOString(),
          },
        ]);
        return NextResponse.json({ action: 'deny', reason: 'Salah ruangan' });
      }

      const nowMs = now.getTime();
      const startMs = new Date(qrPayload.startTime).getTime() - 10 * 60 * 1000;
      const endMs = new Date(qrPayload.endTime).getTime() + 5 * 60 * 1000;
      if (nowMs < startMs || nowMs > endMs) {
        await insertAccessLogs([
          {
            eventId,
            roomId: room.id,
            userId: qrPayload.userId,
            userName: qrPayload.userName,
            method: 'qr',
            identifier: qrPayload.bookingId,
            result: 'denied',
            reason: 'Di luar jadwal peminjaman QR',
            timestamp: now.toISOString(),
          },
        ]);
        return NextResponse.json({ action: 'deny', reason: 'Di luar jadwal' });
      }

      const displayName = (qrPayload.userName || 'Mahasiswa').substring(0, 16);
      await insertAccessLogs([
        {
          eventId,
          roomId: room.id,
          userId: qrPayload.userId,
          userName: qrPayload.userName,
          method: 'qr',
          identifier: qrPayload.bookingId,
          result: 'granted',
          reason: `Tiket QR valid (${qrPayload.bookingId})`,
          timestamp: now.toISOString(),
        },
      ]);
      return NextResponse.json({
        action: 'open',
        name: displayName,
        holdMs: 5000,
      });
    }

    // 2. Verifikasi Kartu KTM RFID
    const incomingHash = hashCardUid(rawUid);
    const allCards = await listCards();
    const matchedCard = allCards.find((c) => c.uidHash === incomingHash);

    if (!matchedCard) {
      await insertAccessLogs([
        {
          eventId,
          roomId: room.id,
          method: 'rfid',
          identifier: rawUid,
          result: 'denied',
          reason: 'Kartu KTM tidak terdaftar',
          timestamp: now.toISOString(),
        },
      ]);
      return NextResponse.json({ action: 'deny', reason: 'Kartu tak dikenal' });
    }

    // Cari booking yang disetujui untuk user & ruangan ini
    const approvedBookings = await listBookings({
      userId: matchedCard.userId,
      roomId: room.id,
      status: 'disetujui',
    });

    if (approvedBookings.length === 0) {
      await insertAccessLogs([
        {
          eventId,
          roomId: room.id,
          userId: matchedCard.userId,
          userName: matchedCard.userName,
          method: 'rfid',
          identifier: rawUid,
          result: 'denied',
          reason: 'Tidak ada peminjaman disetujui di lab ini',
          timestamp: now.toISOString(),
        },
      ]);
      return NextResponse.json({ action: 'deny', reason: 'Tak ada booking' });
    }

    // Cek rentang waktu toleransi: 10 menit sebelum mulai s/d 5 menit setelah selesai
    const nowMs = now.getTime();
    const activeBooking = approvedBookings.find((b) => {
      const startMs = new Date(b.startTime).getTime() - 10 * 60 * 1000;
      const endMs = new Date(b.endTime).getTime() + 5 * 60 * 1000;
      return nowMs >= startMs && nowMs <= endMs;
    });

    if (!activeBooking) {
      await insertAccessLogs([
        {
          eventId,
          roomId: room.id,
          userId: matchedCard.userId,
          userName: matchedCard.userName,
          method: 'rfid',
          identifier: rawUid,
          result: 'denied',
          reason: 'Di luar jadwal peminjaman yang disetujui',
          timestamp: now.toISOString(),
        },
      ]);
      return NextResponse.json({ action: 'deny', reason: 'Di luar jadwal' });
    }

    // Akses Diterima!
    const displayName = (matchedCard.userName || 'Mahasiswa').substring(0, 16);
    await insertAccessLogs([
      {
        eventId,
        roomId: room.id,
        userId: matchedCard.userId,
        userName: matchedCard.userName,
        method: 'rfid',
        identifier: rawUid,
        result: 'granted',
        reason: `Akses KTM disetujui (${activeBooking.id})`,
        timestamp: now.toISOString(),
      },
    ]);

    return NextResponse.json({
      action: 'open',
      name: displayName,
      holdMs: 5000,
    });
  } catch (err: any) {
    console.error('[POST /api/gate/verify Error]', err);
    return NextResponse.json({ action: 'deny', reason: 'Server error' }, { status: 500 });
  }
}
