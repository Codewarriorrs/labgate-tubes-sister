export type DecisionCode =
  | 'AKSES_DITERIMA'
  | 'KARTU_TIDAK_DIKENAL'
  | 'TIDAK_ADA_BOOKING'
  | 'DI_LUAR_JADWAL'
  | 'CACHE_KEDALUWARSA'
  | 'TIKET_QR_TIDAK_VALID'
  | 'PIN_SALAH';

export interface DecisionResult {
  action: 'open' | 'deny';
  code: DecisionCode;
  name?: string;
  reason?: string; // Max 16 karakter untuk LCD 16x2
  holdMs?: number;
  bookingId?: string;
  remainingMinutes?: number;
}

export interface CachedBooking {
  id: string;
  userId: string;
  userName: string;
  roomCode: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  status: string;
  cardUidHashes: string[];
}

export interface OutboxLog {
  eventId: string; // UUID v4
  roomCode: string;
  method: 'rfid' | 'qr' | 'manual_pin' | 'remote_unlock';
  identifier: string;
  result: 'granted' | 'denied';
  reason?: string | null;
  userName?: string | null;
  timestamp: string; // ISO
  sent: number; // 0 = pending, 1 = synced
}

export interface MqttScanMessage {
  seq: number;
  room: string;
  method: 'rfid';
  uid: string;
}

export interface MqttCmdMessage {
  seq: number;
  action: 'open' | 'deny';
  name?: string;
  reason?: string;
  holdMs?: number;
}
