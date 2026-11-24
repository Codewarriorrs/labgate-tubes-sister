import { NextRequest, NextResponse } from 'next/server';
import { authenticateGateway } from '@/lib/gatewayAuth';
import { getPendingCommands } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await authenticateGateway(request);
  if (auth.errorResponse) return auth.errorResponse;
  const room = auth.room!;

  try {
    const commands = await getPendingCommands(room.id);
    return NextResponse.json({
      success: true,
      data: {
        roomCode: room.code,
        commands,
      },
      message: `${commands.length} perintah antrean aktif berhasil diambil`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Gagal mengambil antrean perintah', error: err.message },
      { status: 500 }
    );
  }
}
