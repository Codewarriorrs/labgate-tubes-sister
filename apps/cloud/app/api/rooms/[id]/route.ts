import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRoomById, updateRoom, deleteRoom, listEquipment } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const updateRoomSchema = z.object({
  name: z.string().min(3).optional(),
  capacity: z.number().int().positive().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const room = await getRoomById(params.id);
  if (!room) {
    return NextResponse.json(
      { success: false, data: null, message: `Ruangan dengan ID ${params.id} tidak ditemukan` },
      { status: 404 }
    );
  }

  const equipment = await listEquipment(room.id);
  return NextResponse.json({
    success: true,
    data: {
      ...room,
      equipment,
      isOnline: room.lastSeen ? Date.now() - new Date(room.lastSeen).getTime() < 120000 : false,
    },
    message: 'Data ruangan berhasil diambil',
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, data: null, message: 'Hanya admin yang dapat memperbarui data ruangan' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = updateRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, message: parsed.error.errors[0]?.message || 'Input tidak valid' },
      { status: 400 }
    );
  }

  const updated = await updateRoom(params.id, parsed.data);
  if (!updated) {
    return NextResponse.json(
      { success: false, data: null, message: `Ruangan ${params.id} tidak ditemukan` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: updated,
    message: `Ruangan ${updated.name} berhasil diperbarui`,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { success: false, data: null, message: 'Hanya admin yang dapat menghapus ruangan' },
      { status: 403 }
    );
  }

  const success = await deleteRoom(params.id);
  if (!success) {
    return NextResponse.json(
      { success: false, data: null, message: `Ruangan ${params.id} tidak ditemukan atau gagal dihapus` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: null,
    message: `Ruangan ${params.id} berhasil dihapus`,
  });
}
