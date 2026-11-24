import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listCards, createCard } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const createCardSchema = z.object({
  userId: z.string().min(1, 'Pengguna wajib dipilih'),
  rawUid: z.string().min(4, 'UID kartu RFID minimal 4 karakter hex (contoh: 01020304)'),
  label: z.string().min(2, 'Label kartu wajib diisi (contoh: KTM Utama)'),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: false, data: null, message: 'Autentikasi dibutuhkan' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterUserId = user.role === 'mahasiswa' ? user.userId : searchParams.get('userId') || undefined;

    const cards = await listCards(filterUserId);
    return NextResponse.json({
      success: true,
      data: cards,
      message: 'Daftar kartu RFID berhasil diambil',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: null, message: 'Gagal mengambil data kartu', error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, data: null, message: 'Akses ditolak: Hanya admin yang dapat mendaftarkan kartu RFID' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createCardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, message: parsed.error.errors[0]?.message || 'Input kartu tidak valid' },
        { status: 400 }
      );
    }

    const card = await createCard(parsed.data);
    return NextResponse.json(
      {
        success: true,
        data: card,
        message: `Kartu ${card.label} berhasil didaftarkan dengan hash SHA-256 + pepper`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Gagal mendaftarkan kartu', error: err.message },
      { status: 500 }
    );
  }
}
