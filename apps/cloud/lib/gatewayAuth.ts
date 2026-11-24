import { NextRequest } from 'next/server';
import { findRoomByApiKey } from './db';
import { Room } from '@/types';

/**
 * Memvalidasi autentikasi Gateway melalui header Authorization: Bearer <API_KEY>
 */
export async function authenticateGateway(request: NextRequest): Promise<{ room: Room | null; errorResponse?: Response }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      room: null,
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          data: null,
          message: 'Autentikasi Gateway gagal: Header Authorization Bearer dibutuhkan',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  const apiKey = authHeader.substring(7).trim();
  const room = await findRoomByApiKey(apiKey);

  if (!room) {
    return {
      room: null,
      errorResponse: new Response(
        JSON.stringify({
          success: false,
          data: null,
          message: 'Autentikasi Gateway gagal: API Key tidak valid atau tidak terdaftar untuk ruangan mana pun',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { room };
}
