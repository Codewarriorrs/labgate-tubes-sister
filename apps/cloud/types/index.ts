export type UserRole = 'mahasiswa' | 'dosen' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  nim?: string | null;
  createdAt: string;
}

export interface Card {
  id: string;
  userId: string;
  uidHash: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  userName?: string;
  userNim?: string | null;
  userRole?: UserRole;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  capacity: number;
  description: string;
  apiKeyHash: string;
  isActive: boolean;
  lastSeen?: string | null;
  lastSync?: string | null;
  version?: string | null;
  queueCount: number;
  createdAt: string;
}

export interface Equipment {
  id: string;
  roomId: string;
  name: string;
  code: string;
  isAvailable: boolean;
  createdAt: string;
}

export type BookingStatus = 'menunggu' | 'disetujui' | 'ditolak' | 'dibatalkan';

export interface Booking {
  id: string;
  userId: string;
  userName?: string;
  roomId: string;
  roomName?: string;
  roomCode?: string;
  equipmentId?: string | null;
  equipmentName?: string | null;
  purpose: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  status: BookingStatus;
  rejectionReason?: string | null;
  qrToken?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AccessMethod = 'rfid' | 'qr' | 'manual_pin' | 'remote_unlock';
export type AccessResult = 'granted' | 'denied';

export interface AccessLog {
  id: string;
  eventId: string;
  roomId: string;
  roomName?: string | null;
  roomCode?: string;
  userId?: string | null;
  userName?: string | null;
  method: AccessMethod;
  identifier: string;
  result: AccessResult;
  reason?: string | null;
  timestamp: string;
  createdAt: string;
}

export type GatewayCommandAction = 'remote_unlock' | 'force_sync';
export type GatewayCommandStatus = 'pending' | 'executed' | 'expired';

export interface GatewayCommand {
  id: string;
  roomId: string;
  action: GatewayCommandAction;
  payload: Record<string, any>;
  status: GatewayCommandStatus;
  expiresAt: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  error?: any;
}

export interface JWTPayload {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
}
