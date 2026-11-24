import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CachedBooking, OutboxLog } from './types';

export class GatewayDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.resolve(process.cwd(), 'data/gateway.db');
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(resolvedPath);
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cached_bookings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        room_code TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT NOT NULL,
        card_uid_hashes TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS outbox_logs (
        event_id TEXT PRIMARY KEY,
        room_code TEXT NOT NULL,
        method TEXT NOT NULL,
        identifier TEXT NOT NULL,
        result TEXT NOT NULL,
        reason TEXT,
        user_name TEXT,
        timestamp TEXT NOT NULL,
        sent INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_outbox_sent ON outbox_logs(sent);
      CREATE INDEX IF NOT EXISTS idx_outbox_time ON outbox_logs(timestamp DESC);
    `);
  }

  public upsertSnapshot(snapshot: {
    publicKey: string;
    serverTime: string;
    bookings: any[];
    revokedBookingIds?: string[];
  }) {
    const nowIso = new Date().toISOString();

    const insertMeta = this.db.prepare(
      `INSERT INTO cache_metadata (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`
    );

    const upsertBkg = this.db.prepare(
      `INSERT INTO cached_bookings (id, user_id, user_name, room_code, start_time, end_time, status, card_uid_hashes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         user_name=excluded.user_name,
         start_time=excluded.start_time,
         end_time=excluded.end_time,
         status=excluded.status,
         card_uid_hashes=excluded.card_uid_hashes,
         updated_at=excluded.updated_at`
    );

    const deleteBkg = this.db.prepare(`DELETE FROM cached_bookings WHERE id = ?`);

    const transaction = this.db.transaction(() => {
      // Simpan Public Key Ed25519 dan Waktu Sinkronisasi
      insertMeta.run('publicKey', snapshot.publicKey, nowIso);
      insertMeta.run('lastSyncTime', nowIso, nowIso);
      insertMeta.run('serverTime', snapshot.serverTime, nowIso);

      // Upsert Booking
      for (const b of snapshot.bookings) {
        upsertBkg.run(
          b.id,
          b.userId,
          b.userName,
          b.roomCode,
          b.startTime,
          b.endTime,
          b.status,
          JSON.stringify(b.cardUidHashes || []),
          nowIso
        );
      }

      // Hapus booking yang dicabut
      if (snapshot.revokedBookingIds) {
        for (const revId of snapshot.revokedBookingIds) {
          deleteBkg.run(revId);
        }
      }
    });

    transaction();
  }

  public getPublicKey(): string | null {
    const row = this.db
      .prepare(`SELECT value FROM cache_metadata WHERE key = 'publicKey'`)
      .get() as { value: string } | undefined;
    return row ? row.value : null;
  }

  public getLastSyncTime(): Date | null {
    const row = this.db
      .prepare(`SELECT value FROM cache_metadata WHERE key = 'lastSyncTime'`)
      .get() as { value: string } | undefined;
    return row ? new Date(row.value) : null;
  }

  public getCachedBookings(): CachedBooking[] {
    const rows = this.db.prepare(`SELECT * FROM cached_bookings WHERE status = 'disetujui'`).all() as any[];
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      roomCode: r.room_code,
      startTime: r.start_time,
      endTime: r.end_time,
      status: r.status,
      cardUidHashes: JSON.parse(r.card_uid_hashes || '[]'),
    }));
  }

  public enqueueLog(log: Omit<OutboxLog, 'sent'>) {
    const nowIso = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO outbox_logs (event_id, room_code, method, identifier, result, reason, user_name, timestamp, sent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .run(
        log.eventId,
        log.roomCode,
        log.method,
        log.identifier,
        log.result,
        log.reason || null,
        log.userName || null,
        log.timestamp,
        nowIso
      );
  }

  public getUnsentLogs(limit = 50): OutboxLog[] {
    const rows = this.db
      .prepare(`SELECT * FROM outbox_logs WHERE sent = 0 ORDER BY timestamp ASC LIMIT ?`)
      .all(limit) as any[];
    return rows.map((r) => ({
      eventId: r.event_id,
      roomCode: r.room_code,
      method: r.method,
      identifier: r.identifier,
      result: r.result,
      reason: r.reason,
      userName: r.user_name,
      timestamp: r.timestamp,
      sent: r.sent,
    }));
  }

  public markLogsSent(eventIds: string[]) {
    if (eventIds.length === 0) return;
    const placeholders = eventIds.map(() => '?').join(',');
    this.db.prepare(`UPDATE outbox_logs SET sent = 1 WHERE event_id IN (${placeholders})`).run(...eventIds);
  }

  public getRecentLogs(limit = 20): OutboxLog[] {
    const rows = this.db
      .prepare(`SELECT * FROM outbox_logs ORDER BY timestamp DESC LIMIT ?`)
      .all(limit) as any[];
    return rows.map((r) => ({
      eventId: r.event_id,
      roomCode: r.room_code,
      method: r.method,
      identifier: r.identifier,
      result: r.result,
      reason: r.reason,
      userName: r.user_name,
      timestamp: r.timestamp,
      sent: r.sent,
    }));
  }

  public getUnsentCount(): number {
    const row = this.db.prepare(`SELECT COUNT(*) as cnt FROM outbox_logs WHERE sent = 0`).get() as { cnt: number };
    return row.cnt;
  }

  public close() {
    this.db.close();
  }
}
