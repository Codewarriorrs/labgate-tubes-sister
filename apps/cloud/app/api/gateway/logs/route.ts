import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateGateway } from '@/lib/gatewayAuth';
import { insertAccessLogs } from '@/lib/db';

const logItemSchema = z.object({
  eventId: z.string().uuid('Event ID harus berformat UUID v4'),
  roomCode: z.string(),
  method: z.enum(['rfid', 'qr', 'manual_pin', 'remote_unlock']),
  identifier: z.string(),
  result: z.enum(['granted', 'denied']),
  reason: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  timestamp: z.string().datetime(),
});

const batchLogsSchema = z.object({
  logs: z.array(logItemSchema).min(1, 'Array logs tidak boleh kosong'),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateGateway(request);
  if (auth.errorResponse) return auth.errorResponse;
  const room = auth.room!;

  try {
    const body = await request.json();
    const parsed = batchLogsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: parsed.error.errors[0]?.message || 'Format log antrean tidak valid',
          error: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const logsToInsert = parsed.data.logs.map((log) => ({
      eventId: log.eventId,
      roomId: room.id,
      method: log.method,
      identifier: log.identifier,
      result: log.result,
      reason: log.reason || null,
      userName: log.userName || null,
      timestamp: log.timestamp,
    }));

    const { acceptedCount, acceptedEventIds } = await insertAccessLogs(logsToInsert);

    return NextResponse.json({
      success: true,
      data: {
        processed: acceptedCount,
        acceptedEventIds,
      },
      message: `${acceptedCount} log akses berhasil diproses dan disimpan secara idempoten`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Gagal memproses batch logs', error: err.message },
      { status: 500 }
    );
  }
}
