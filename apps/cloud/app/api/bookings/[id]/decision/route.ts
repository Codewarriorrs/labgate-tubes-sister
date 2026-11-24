import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { approveOrRejectBooking, getBookingById } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const decisionSchema = z.object({
  decision: z.enum(['disetujui', 'ditolak']),
  rejectionReason: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      return NextResponse.json(
        { success: false, data: null, message: 'Akses ditolak: Hanya dosen atau admin yang berhak memproses approval booking' },
        { status: 403 }
      );
    }

    const booking = await getBookingById(params.id);
    if (!booking) {
      return NextResponse.json(
        { success: false, data: null, message: `Booking ${params.id} tidak ditemukan` },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, message: parsed.error.errors[0]?.message || 'Input keputusan tidak valid' },
        { status: 400 }
      );
    }

    const { decision, rejectionReason } = parsed.data;
    if (decision === 'ditolak' && (!rejectionReason || rejectionReason.trim().length === 0)) {
      return NextResponse.json(
        { success: false, data: null, message: 'Catatan alasan wajib diisi saat menolak permohonan booking' },
        { status: 400 }
      );
    }

    const updated = await approveOrRejectBooking(params.id, decision, rejectionReason);
    return NextResponse.json({
      success: true,
      data: updated,
      message: decision === 'disetujui'
        ? `Permohonan booking ${params.id} berhasil disetujui. Tiket QR ber-tanda tangan telah diterbitkan.`
        : `Permohonan booking ${params.id} ditolak dengan alasan: "${rejectionReason}"`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Gagal memproses keputusan booking', error: err.message },
      { status: 500 }
    );
  }
}
