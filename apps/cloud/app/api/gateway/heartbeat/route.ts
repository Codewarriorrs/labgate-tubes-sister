import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateGateway } from '@/lib/gatewayAuth';
import { updateRoomHeartbeat } from '@/lib/db';

const heartbeatSchema = z.object({
  roomCode: z.string(),
  version: z.string().default('1.0.0'),
  queueCount: z.number().int().nonnegative().default(0),
  lastSync: z.string().datetime().optional(),
});

export async function PUT(request: NextRequest) {
  const auth = await authenticateGateway(request);
  if (auth.errorResponse) return auth.errorResponse;
  const room = auth.room!;

  try {
    const body = await request.json();
    const parsed = heartbeatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, message: parsed.error.errors[0]?.message || 'Input heartbeat tidak valid' },
        { status: 400 }
      );
    }

    const { version, queueCount, lastSync } = parsed.data;
    await updateRoomHeartbeat(room.id, { version, queueCount, lastSync });

    const nowIso = new Date().toISOString();
    return NextResponse.json({
      success: true,
      data: {
        roomCode: room.code,
        status: 'online',
        lastSeen: nowIso,
        receivedQueueCount: queueCount,
      },
      message: 'Status detak jantung (heartbeat) gateway berhasil diperbarui',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Gagal memperbarui heartbeat', error: err.message },
      { status: 500 }
    );
  }
}
