import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listBookings, createBooking, checkBookingConflict, getRoomById } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { BookingStatus } from '@/types';

const createBookingSchema = z.object({
  roomId: z.string().min(1, 'Ruangan wajib dipilih'),
  equipmentId: z.string().nullable().optional(),
  purpose: z.string().min(5, 'Keperluan penggunaan laboratorium minimal 5 karakter'),
  startTime: z.string().datetime('Format tanggal & jam mulai tidak valid (ISO 8601)'),
  endTime: z.string().datetime('Format tanggal & jam selesai tidak valid (ISO 8601)'),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, data: null, message: 'Autentikasi dibutuhkan' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId') || undefined;
    const status = (searchParams.get('status') as BookingStatus) || undefined;

    // Mahasiswa hanya melihat booking miliknya, kecuali admin/dosen
    const filterUserId = user.role === 'mahasiswa' ? user.userId : searchParams.get('userId') || undefined;

    const bookings = await listBookings({
      userId: filterUserId,
      roomId,
      status,
    });

    return NextResponse.json({
      success: true,
      data: bookings,
      message: 'Daftar booking berhasil diambil',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Gagal mengambil data booking', error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, data: null, message: 'Autentikasi dibutuhkan' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: parsed.error.errors[0]?.message || 'Input booking tidak valid',
          error: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { roomId, equipmentId, purpose, startTime, endTime } = parsed.data;

    // Validasi rentang waktu
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (end <= start) {
      return NextResponse.json(
        { success: false, data: null, message: 'Waktu selesai harus lebih besar daripada waktu mulai' },
        { status: 400 }
      );
    }

    const room = await getRoomById(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, data: null, message: `Ruangan dengan kode ${roomId} tidak ditemukan` },
        { status: 404 }
      );
    }

    // CEGAH BENTROK JADWAL DI SISI SERVER
    const conflict = await checkBookingConflict(room.id, startTime, endTime);
    if (conflict.hasConflict) {
      const confStart = new Date(conflict.conflictingBooking!.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const confEnd = new Date(conflict.conflictingBooking!.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `${room.name} sudah dibooking pada pukul ${confStart} - ${confEnd}. Silakan pilih jam atau ruangan lain`,
          conflict: conflict.conflictingBooking,
        },
        { status: 409 }
      );
    }

    const newBooking = await createBooking({
      userId: user.userId,
      roomId: room.id,
      equipmentId: equipmentId || null,
      purpose,
      startTime,
      endTime,
    });

    return NextResponse.json(
      {
        success: true,
        data: newBooking,
        message: 'Permohonan booking berhasil diajukan dan menunggu persetujuan dosen/admin',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Gagal membuat permohonan booking', error: err.message },
      { status: 500 }
    );
  }
}
