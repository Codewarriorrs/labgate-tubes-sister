import { NextRequest, NextResponse } from 'next/server';
import { deleteCard } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, data: null, message: 'Akses ditolak: Hanya admin yang dapat menghapus kartu' },
      { status: 403 }
    );
  }

  const success = await deleteCard(params.id);
  if (!success) {
    return NextResponse.json(
      { success: false, data: null, message: `Kartu ${params.id} tidak ditemukan` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: null,
    message: `Kartu ${params.id} berhasil dihapus dari sistem`,
  });
}
