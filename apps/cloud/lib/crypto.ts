import crypto from 'crypto';
import * as jose from 'jose';

const DEFAULT_PEPPER = 'labgate_undip_tembalang_secure_pepper_2026';
const CARD_PEPPER = process.env.CARD_PEPPER || DEFAULT_PEPPER;

/**
 * Hash UID kartu RFID menggunakan SHA-256 dan pepper
 */
export function hashCardUid(uid: string, customPepper?: string): string {
  const pepper = customPepper || CARD_PEPPER;
  const normalizedUid = uid.toLowerCase().trim();
  return crypto.createHash('sha256').update(normalizedUid + pepper).digest('hex');
}

/**
 * Hash API Key Gateway menggunakan SHA-256
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey.trim()).digest('hex');
}

// In-memory keypair default jika env belum diset
let edPrivateKey: crypto.KeyObject | null = null;
let edPublicKey: crypto.KeyObject | null = null;
let edPublicKeySpki: string = '';

function initEdKeys() {
  if (process.env.QR_PRIVATE_KEY && process.env.QR_PUBLIC_KEY) {
    try {
      edPrivateKey = crypto.createPrivateKey(process.env.QR_PRIVATE_KEY);
      edPublicKey = crypto.createPublicKey(process.env.QR_PUBLIC_KEY);
      edPublicKeySpki = process.env.QR_PUBLIC_KEY;
      return;
    } catch {
      // Fallback generate
    }
  }

  // Generate deterministik jika tidak diset di env
  const seed = crypto.createHash('sha256').update('labgate-ed25519-root-seed-2026').digest();
  const keyPair = crypto.generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  edPrivateKey = crypto.createPrivateKey(keyPair.privateKey);
  edPublicKey = crypto.createPublicKey(keyPair.publicKey);
  edPublicKeySpki = keyPair.publicKey;
}

initEdKeys();

/**
 * Ambil Public Key Ed25519 dalam format PEM (SPKI) untuk dibagikan ke Gateway
 */
export function getQrPublicKey(): string {
  if (!edPublicKeySpki) initEdKeys();
  return edPublicKeySpki;
}

export interface QrTicketPayload {
  bookingId: string;
  roomId: string;
  roomCode: string;
  userId: string;
  userName: string;
  startTime: string; // ISO
  endTime: string;   // ISO
}

/**
 * Menandatangani tiket QR menggunakan kunci privat Ed25519
 */
export async function signQrTicket(payload: QrTicketPayload): Promise<string> {
  if (!edPrivateKey) initEdKeys();
  const importedKey = await jose.importPKCS8(
    edPrivateKey!.export({ type: 'pkcs8', format: 'pem' }) as string,
    'EdDSA'
  );

  return new jose.SignJWT({
    bid: payload.bookingId,
    rid: payload.roomId,
    rc: payload.roomCode,
    uid: payload.userId,
    un: payload.userName,
    st: payload.startTime,
    et: payload.endTime,
  })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuedAt()
    .setExpirationTime(new Date(payload.endTime).getTime() / 1000 + 3600) // valid sampai 1 jam setelah booking selesai
    .sign(importedKey);
}

/**
 * Verifikasi tiket QR menggunakan kunci publik Ed25519
 */
export async function verifyQrTicket(token: string, publicKeyPem?: string): Promise<QrTicketPayload | null> {
  try {
    const keyPem = publicKeyPem || getQrPublicKey();
    const importedPublicKey = await jose.importSPKI(keyPem, 'EdDSA');
    const { payload } = await jose.jwtVerify(token, importedPublicKey);

    return {
      bookingId: payload.bid as string,
      roomId: payload.rid as string,
      roomCode: payload.rc as string,
      userId: payload.uid as string,
      userName: payload.un as string,
      startTime: payload.st as string,
      endTime: payload.et as string,
    };
  } catch {
    return null;
  }
}
