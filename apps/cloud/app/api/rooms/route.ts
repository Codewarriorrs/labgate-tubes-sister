import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listRooms, createRoom, listEquipment } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const createRoomSchema = z.object({
  name: z.string().min(3, 'Nama ruangan minimal 3 karakter'),
  code: z.string().min(2, 'Kode ruangan minimal 2 karakter (contoh: lab-01)'),
  capacity: z.number().int().positive().default(30),
  description: z.string().default(''),
  apiKey: z.string().min(8, 'API Key Gateway minimal 8 karakter'),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const rooms = await listRooms();
    const roomsWithEquipment = await Promise.all(
      rooms.map(async (r) => {
        const eq = await listEquipment(r.id);
        return {
          ...r,
          equipment: eq,
          isOnline: r.lastSeen ? Date.now() - new Date(r.lastSeen).getTime() < 120000 : false,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: roomsWithEquipment,
      message: 'Daftar ruangan laboratorium berhasil diambil',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Gagal mengambil daftar ruangan', error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, data: null, message: 'Akses ditolak: Hanya admin yang dapat mendaftarkan ruangan baru' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: parsed.error.errors[0]?.message || 'Input ruangan tidak valid',
          error: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const room = await createRoom(parsed.data);
    return NextResponse.json(
      {
        success: true,
        data: room,
        message: `Ruangan ${room.name} (${room.code}) berhasil didaftarkan`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Gagal membuat ruangan baru', error: err.message },
      { status: 500 }
    );
  }
}
