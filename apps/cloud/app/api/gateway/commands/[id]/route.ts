import { NextRequest, NextResponse } from 'next/server';
import { authenticateGateway } from '@/lib/gatewayAuth';
import { deleteGatewayCommand } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateGateway(request);
  if (auth.errorResponse) return auth.errorResponse;
  const room = auth.room!;

  try {
    const success = await deleteGatewayCommand(params.id, room.id);
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `Perintah ${params.id} tidak ditemukan atau telah kedaluwarsa`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: params.id, acknowledged: true },
      message: `Perintah ${params.id} berhasil dikonfirmasi dan dihapus dari antrean`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Gagal menghapus perintah', error: err.message },
      { status: 500 }
    );
  }
}
