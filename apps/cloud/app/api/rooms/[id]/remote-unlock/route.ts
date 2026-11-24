import { NextRequest, NextResponse } from 'next/server';
import { getRoomById, createGatewayCommand, insertAccessLogs } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      return NextResponse.json(
        { success: false, data: null, message: 'Akses ditolak: Hanya dosen atau admin yang dapat membuka pintu jarak jauh' },
        { status: 403 }
      );
    }

    const room = await getRoomById(params.id);
    if (!room) {
      return NextResponse.json(
        { success: false, data: null, message: `Ruangan ${params.id} tidak ditemukan` },
        { status: 404 }
      );
    }

    // Buat perintah antrean gateway
    const cmd = await createGatewayCommand(room.id, 'remote_unlock', {
      holdMs: 5000,
      operatorId: user.userId,
      operatorName: user.name,
      operatorRole: user.role,
    });

    // Catat ke access_log cloud
    await insertAccessLogs([
      {
        eventId: `cmd_evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        roomId: room.id,
        roomCode: room.code,
        userId: user.userId,
        userName: user.name,
        method: 'remote_unlock',
        identifier: user.name,
        result: 'granted',
        reason: 'Buka pintu jarak jauh oleh staf pengajar/admin',
        timestamp: new Date().toISOString(),
      },
    ]);

    return NextResponse.json({
      success: true,
      data: cmd,
      message: `Perintah buka pintu jarak jauh untuk ${room.name} (${room.code}) telah dimasukkan ke antrean gateway`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Gagal mengeksekusi buka pintu jarak jauh', error: err.message },
      { status: 500 }
    );
  }
}
