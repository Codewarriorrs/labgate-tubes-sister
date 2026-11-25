import { NextRequest, NextResponse } from 'next/server';
import { listAccessLogs } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, data: null, message: 'Autentikasi dibutuhkan' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId') || undefined;
    const method = searchParams.get('method') || undefined;
    const result = searchParams.get('result') || undefined;

    const logs = await listAccessLogs({ roomId, method, result });

    return NextResponse.json({
      success: true,
      data: logs,
      message: 'Log akses laboratorium berhasil diambil',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Gagal mengambil log akses', error: err.message },
      { status: 500 }
    );
  }
}
