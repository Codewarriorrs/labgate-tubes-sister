import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { findUserById } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getCurrentUser(request);
  if (!session) {
    return NextResponse.json(
      { success: false, data: null, message: 'Belum masuk / sesi kedaluwarsa' },
      { status: 401 }
    );
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json(
      { success: false, data: null, message: 'Data pengguna tidak ditemukan' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: user,
    message: 'Data sesi pengguna aktif berhasil diambil',
  });
}
