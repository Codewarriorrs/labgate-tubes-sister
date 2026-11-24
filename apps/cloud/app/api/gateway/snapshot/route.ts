import { NextRequest, NextResponse } from 'next/server';
import { authenticateGateway } from '@/lib/gatewayAuth';
import { listBookings, listCards, updateRoomHeartbeat } from '@/lib/db';
import { getQrPublicKey } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const auth = await authenticateGateway(request);
  if (auth.errorResponse) return auth.errorResponse;
  const room = auth.room!;

  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get('since');
  const sinceDate = sinceParam ? new Date(sinceParam) : null;

  // Rentang waktu: Hari ini dan Besok
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfTomorrow = new Date();
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
  endOfTomorrow.setHours(23, 59, 59, 999);

  // Ambil semua booking untuk ruangan ini
  const allRoomBookings = await listBookings({ roomId: room.id });
  const allCards = await listCards();

  // Booking yang disetujui dalam rentang hari ini & besok
  const approvedBookings = allRoomBookings.filter((b) => {
    if (b.status !== 'disetujui') return false;
    const bStart = new Date(b.startTime);
    const inTimeWindow = bStart >= startOfDay && bStart <= endOfTomorrow;
    if (!inTimeWindow) return false;
    if (sinceDate) {
      return new Date(b.updatedAt) > sinceDate;
    }
    return true;
  });

  // Booking yang dibatalkan / ditolak sejak ?since= untuk pembaruan inkremental
  const revokedBookingIds: string[] = [];
  if (sinceDate) {
    allRoomBookings.forEach((b) => {
      if ((b.status === 'dibatalkan' || b.status === 'ditolak') && new Date(b.updatedAt) > sinceDate) {
        revokedBookingIds.push(b.id);
      }
    });
  }

  // Petakan booking beserta hash UID kartu pemiliknya
  const bookingsWithCards = approvedBookings.map((b) => {
    const userCards = allCards.filter((c) => c.userId === b.userId && c.isActive);
    return {
      id: b.id,
      userId: b.userId,
      userName: b.userName || 'Mahasiswa',
      roomCode: room.code,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      cardUidHashes: userCards.map((c) => c.uidHash),
    };
  });

  const nowIso = new Date().toISOString();
  await updateRoomHeartbeat(room.id, { lastSync: nowIso });

  return NextResponse.json({
    success: true,
    data: {
      serverTime: nowIso,
      publicKey: getQrPublicKey(),
      roomId: room.id,
      roomCode: room.code,
      roomName: room.name,
      bookings: bookingsWithCards,
      revokedBookingIds,
    },
    message: 'Snapshot ketersediaan & kredensial offline berhasil diambil',
  });
}
