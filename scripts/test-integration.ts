import { CloudClient } from '../apps/gateway/src/cloudClient';
import { GatewayDatabase } from '../apps/gateway/src/sqliteDb';
import { evaluateAccess, DecisionContext } from '../apps/gateway/src/decisionEngine';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

console.log('=== TES INTEGRASI DUA SERVICE & SKENARIO OFFLINE (scripts/test-integration.ts) ===\n');

const CLOUD_URL = process.env.CLOUD_URL || 'http://localhost:3000';
const API_KEY = 'gw_lab01_secret_key_semarang_2026';
const ROOM_CODE = 'lab-01';

async function runIntegrationTest() {
  // Gunakan database sqlite pengujian terisolasi
  const testDbPath = path.resolve(__dirname, '../apps/gateway/data/test_gateway.db');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  const db = new GatewayDatabase(testDbPath);

  const client = new CloudClient({
    cloudUrl: CLOUD_URL,
    apiKey: API_KEY,
    roomCode: ROOM_CODE,
  });

  console.log('[FASE 1: PENGUJIAN 4 METODE HTTP ANTAR-SERVICE DARI UJUNG KE UJUNG]');

  // 1. GET /api/gateway/snapshot
  console.log('1. Menguji GET /api/gateway/snapshot...');
  const snapshotRes = await client.fetchSnapshot();
  if (!snapshotRes.success || !snapshotRes.data) {
    console.error('   ✗ Gagal GET snapshot:', snapshotRes.error);
    process.exit(1);
  }
  console.log(`   ✓ Sukses GET: Diterima ${snapshotRes.data.bookings?.length || 0} booking aktif dan kunci publik Ed25519`);
  db.upsertSnapshot(snapshotRes.data);

  // 2. POST /api/gateway/logs
  console.log('2. Menguji POST /api/gateway/logs (Outbox Logging Idempoten)...');
  const eventId1 = crypto.randomUUID();
  const testLogs = [
    {
      eventId: eventId1,
      roomCode: ROOM_CODE,
      method: 'rfid',
      identifier: '01020304',
      result: 'granted',
      userName: 'Muhammad Isya Asyhari',
      timestamp: new Date().toISOString(),
    },
  ];
  const logsRes = await client.sendLogs(testLogs);
  if (!logsRes.success) {
    console.error('   ✗ Gagal POST logs:', logsRes.error);
    process.exit(1);
  }
  console.log(`   ✓ Sukses POST: Berhasil memproses eventId ${eventId1}`);

  // 3. PUT /api/gateway/heartbeat
  console.log('3. Menguji PUT /api/gateway/heartbeat (Status Diagnostik & Antrean)...');
  const hbRes = await client.sendHeartbeat(0, new Date().toISOString());
  if (!hbRes.success) {
    console.error('   ✗ Gagal PUT heartbeat:', hbRes.error);
    process.exit(1);
  }
  console.log('   ✓ Sukses PUT: Heartbeat terkonfirmasi online di Cloud');

  // 4. GET /api/gateway/commands & DELETE /api/gateway/commands/{id}
  console.log('4. Menguji GET & DELETE /api/gateway/commands (Antrean Perintah Admin)...');
  // Trigger remote unlock di cloud via POST /api/rooms/lab-01/remote-unlock
  const triggerRes = await fetch(`${CLOUD_URL}/api/rooms/lab-01/remote-unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const triggerJson = await triggerRes.json();
  const createdCmdId = triggerJson.data?.id;

  // Gateway ambil perintah via GET
  const cmdRes = await client.fetchCommands();
  if (!cmdRes.success || !cmdRes.commands) {
    console.error('   ✗ Gagal GET commands:', cmdRes.error);
    process.exit(1);
  }
  console.log(`   ✓ Sukses GET commands: Ditemukan ${cmdRes.commands.length} perintah aktif`);

  if (cmdRes.commands.length > 0) {
    const targetCmd = cmdRes.commands[0];
    console.log(`   Mengonfirmasi eksekusi perintah ${targetCmd.id} via DELETE...`);
    const delRes = await client.acknowledgeCommand(targetCmd.id);
    if (!delRes.success) {
      console.error('   ✗ Gagal DELETE command:', delRes.error);
      process.exit(1);
    }
    console.log(`   ✓ Sukses DELETE: Perintah ${targetCmd.id} berhasil dihapus dari antrean server`);
  }

  console.log('\n[FASE 2: SKENARIO KETAHANAN GATEWAY SAAT OFFLINE]');
  console.log('Memutus akses jaringan ke Cloud (Koneksi cloud mati)...');

  // Menguji mesin keputusan gateway saat offline menggunakan cache SQLite
  const cachedBookings = db.getCachedBookings();
  const cachedPubKey = db.getPublicKey();
  const lastSync = db.getLastSyncTime();

  console.log(`Jumlah booking tersimpan di cache SQLite: ${cachedBookings.length}`);
  console.log(`Kunci publik offline tersedia: ${!!cachedPubKey}`);

  const offlineContext: DecisionContext = {
    roomCode: ROOM_CODE,
    currentTime: new Date(),
    cachedBookings,
    cachedPublicKey: cachedPubKey,
    lastSyncTime: lastSync,
  };

  // Mahasiswa Isya melakukan tap kartu saat internet mati
  const offlineDecision = await evaluateAccess('rfid', '01020304', offlineContext);
  console.log(`Hasil verifikasi tap kartu offline: ${offlineDecision.action.toUpperCase()} (${offlineDecision.code})`);

  if (offlineDecision.action !== 'open') {
    console.error('✗ GAGAL: Gateway seharusnya tetap membuka pintu untuk booking aktif dalam cache!');
    process.exit(1);
  }
  console.log('✓ BERHASIL: Pintu tetap dibuka 5 detik untuk Muhammad Isya Asyhari meskipun internet mati!');

  // Catat event offline ke outbox lokal
  const offlineEventId = crypto.randomUUID();
  db.enqueueLog({
    eventId: offlineEventId,
    roomCode: ROOM_CODE,
    method: 'rfid',
    identifier: '01020304',
    result: 'granted',
    userName: offlineDecision.name,
    timestamp: new Date().toISOString(),
  });
  console.log(`Event akses offline tercatat aman di outbox lokal (EventId: ${offlineEventId})`);

  console.log('\n[FASE 3: PEMULIHAN JARINGAN (RECOVERY & FLUSH OUTBOX)]');
  console.log('Internet kampus kembali menyala... Mengirim antrean outbox ke cloud...');

  const unsentLogs = db.getUnsentLogs();
  console.log(`Ditemukan ${unsentLogs.length} log tertunda di outbox lokal.`);

  const syncOutboxRes = await client.sendLogs(unsentLogs);
  if (syncOutboxRes.success && syncOutboxRes.acceptedIds) {
    db.markLogsSent(syncOutboxRes.acceptedIds);
    console.log(`✓ BERHASIL: Seluruh ${syncOutboxRes.acceptedIds.length} log berhasil disinkronkan ke Cloud.`);
  }

  const remainingUnsent = db.getUnsentCount();
  console.log(`Sisa antrean outbox di lokal: ${remainingUnsent} event.`);

  if (remainingUnsent === 0) {
    console.log('\n🎉 INTEGRASI DUA SERVICE & KETAHANAN OFFLINE TERBUKTI 100% SUKSES!');
    db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    process.exit(0);
  } else {
    console.error('✗ Gagal membersihkan outbox.');
    process.exit(1);
  }
}

runIntegrationTest();
