import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listBookings, createBooking, checkBookingConflict, getRoomById } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { BookingStatus } from '@/types';

export const dynamic = 'force-dynamic';

const createBookingSchema = z.object({
  roomId: z.string().min(1, 'Ruangan wajib dipilih'),
  equipmentId: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  purpose: z.string().min(5, 'Keperluan peminjaman laboratorium minimal 5 karakter'),
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
    const scheduleOnly = searchParams.get('scheduleOnly') === 'true';

    // Jika scheduleOnly=true, return semua jadwal aktif untuk ruangan tersebut agar peminjam tahu jam terisi
    if (scheduleOnly) {
      const allActive = await listBookings({
        roomId,
      });
      // Ambil yang disetujui atau menunggu
      const filtered = allActive.filter((b) => b.status === 'disetujui' || b.status === 'menunggu');
      return NextResponse.json({
        success: true,
        data: filtered,
        message: 'Jadwal ruangan berhasil diambil',
      });
    }

    // Mahasiswa hanya melihat riwayat booking miliknya, kecuali admin/dosen
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

    // 1. Validasi rentang waktu dasar
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const now = Date.now();

    if (end <= start) {
      return NextResponse.json(
        { success: false, data: null, message: 'Waktu selesai harus lebih besar daripada waktu mulai' },
        { status: 400 }
      );
    }

    // 2. Validasi Tidak Boleh di Masa Lalu (toleransi 60 detik untuk network delay)
    if (start < now - 60000) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Waktu mulai peminjaman tidak boleh berada di masa lalu (sebelum waktu sekarang)',
        },
        { status: 400 }
      );
    }

    // 3. Validasi Jam Kerja Operasional (06.00 - 19.00 WIB) - dikomen sementara untuk pengetesan
    /*
    const startDate = new Date(start);
    const startHourWib = (startDate.getUTCHours() + 7) % 24;
    const endDate = new Date(end);
    const endHourWib = (endDate.getUTCHours() + 7) % 24;
    const endMinWib = endDate.getUTCMinutes();

    if (startHourWib < 6) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Peminjaman laboratorium hanya diperbolehkan mulai pukul 06.00 WIB',
        },
        { status: 400 }
      );
    }

    if (endHourWib > 19 || (endHourWib === 19 && endMinWib > 0)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Peminjaman laboratorium hanya diperbolehkan maksimal hingga pukul 19.00 WIB',
        },
        { status: 400 }
      );
    }
    */

    const room = await getRoomById(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, data: null, message: `Ruangan dengan kode ${roomId} tidak ditemukan` },
        { status: 404 }
      );
    }

    // 4. CEGAH BENTROK JADWAL DI SISI SERVER
    const conflict = await checkBookingConflict(room.id, startTime, endTime);
    if (conflict.hasConflict) {
      const confStart = new Date(conflict.conflictingBooking!.startTime).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      });
      const confEnd = new Date(conflict.conflictingBooking!.endTime).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      });
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `${room.name} sudah dipinjam pada pukul ${confStart} - ${confEnd} WIB. Silakan pilih slot jam lain`,
          conflict: conflict.conflictingBooking,
        },
        { status: 409 }
      );
    }

    // Normalize equipmentId (bila array, join comma-separated)
    const formattedEquipmentId = Array.isArray(equipmentId)
      ? equipmentId.filter(Boolean).join(',')
      : equipmentId || null;

    const newBooking = await createBooking({
      userId: user.userId,
      roomId: room.id,
      equipmentId: formattedEquipmentId,
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
