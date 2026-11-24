import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getBookingById, updateBooking, cancelBooking, checkBookingConflict } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const updateBookingSchema = z.object({
  purpose: z.string().min(5).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ success: false, data: null, message: 'Autentikasi dibutuhkan' }, { status: 401 });
  }

  const booking = await getBookingById(params.id);
  if (!booking) {
    return NextResponse.json({ success: false, data: null, message: `Booking ${params.id} tidak ditemukan` }, { status: 404 });
  }

  if (user.role === 'mahasiswa' && booking.userId !== user.userId) {
    return NextResponse.json({ success: false, data: null, message: 'Anda tidak memiliki hak akses melihat booking ini' }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    data: booking,
    message: 'Data booking berhasil diambil',
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ success: false, data: null, message: 'Autentikasi dibutuhkan' }, { status: 401 });
  }

  const booking = await getBookingById(params.id);
  if (!booking) {
    return NextResponse.json({ success: false, data: null, message: `Booking ${params.id} tidak ditemukan` }, { status: 404 });
  }

  if (user.role === 'mahasiswa' && booking.userId !== user.userId) {
    return NextResponse.json({ success: false, data: null, message: 'Anda hanya dapat mengubah permohonan booking milik sendiri' }, { status: 403 });
  }

  if (booking.status !== 'menunggu') {
    return NextResponse.json({
      success: false,
      data: null,
      message: `Booking tidak dapat diubah karena status saat ini adalah "${booking.status}". Hanya booking "menunggu" yang dapat diedit.`,
    }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, data: null, message: parsed.error.errors[0]?.message || 'Input tidak valid' }, { status: 400 });
  }

  const newStart = parsed.data.startTime || booking.startTime;
  const newEnd = parsed.data.endTime || booking.endTime;

  if (new Date(newEnd).getTime() <= new Date(newStart).getTime()) {
    return NextResponse.json({ success: false, data: null, message: 'Waktu selesai harus lebih besar daripada waktu mulai' }, { status: 400 });
  }

  if (parsed.data.startTime || parsed.data.endTime) {
    const conflict = await checkBookingConflict(booking.roomId, newStart, newEnd, booking.id);
    if (conflict.hasConflict) {
      return NextResponse.json({
        success: false,
        data: null,
        message: 'Jadwal yang dipilih bentrok dengan peminjaman lain yang aktif',
      }, { status: 409 });
    }
  }

  const updated = await updateBooking(params.id, parsed.data);
  return NextResponse.json({
    success: true,
    data: updated,
    message: 'Perubahan permohonan booking berhasil disimpan',
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ success: false, data: null, message: 'Autentikasi dibutuhkan' }, { status: 401 });
  }

  const booking = await getBookingById(params.id);
  if (!booking) {
    return NextResponse.json({ success: false, data: null, message: `Booking ${params.id} tidak ditemukan` }, { status: 404 });
  }

  const cancelled = await cancelBooking(params.id, user.userId, user.role);
  if (!cancelled) {
    return NextResponse.json({ success: false, data: null, message: 'Gagal membatalkan booking atau Anda tidak memiliki hak' }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    data: cancelled,
    message: 'Booking berhasil dibatalkan',
  });
}
