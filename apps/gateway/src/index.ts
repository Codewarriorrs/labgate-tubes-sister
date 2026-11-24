import dotenv from 'dotenv';
dotenv.config();

import { GatewayDatabase } from './sqliteDb';
import { CloudClient } from './cloudClient';
import { GatewayMqttHandler } from './mqttHandler';
import { createKioskApp } from './kioskServer';

const PORT = parseInt(process.env.PORT || '4000', 10);
const CLOUD_URL = process.env.CLOUD_URL || 'http://localhost:3000';
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || 'gw_lab01_secret_key_semarang_2026';
const ROOM_CODE = process.env.ROOM_CODE || 'lab-01';
const MQTT_URL = process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883';
const TOPIC_ROOT = process.env.TOPIC_ROOT || `labgate/${ROOM_CODE}`;
const EMERGENCY_PIN = process.env.EMERGENCY_PIN || '1722';
const CARD_PEPPER = process.env.CARD_PEPPER || 'labgate_undip_tembalang_secure_pepper_2026';
const SYNC_INTERVAL_MS = 60000; // 60 detik

console.log('=============================================');
console.log('         LABGATE EDGE GATEWAY SERVICE        ');
console.log('=============================================');
console.log(`Ruangan    : ${ROOM_CODE}`);
console.log(`Port Kiosk : http://localhost:${PORT}`);
console.log(`Cloud URL  : ${CLOUD_URL}`);
console.log(`Broker MQTT: ${MQTT_URL}`);
console.log(`Topik Root : ${TOPIC_ROOT}`);
console.log(`PIN Darurat: ${EMERGENCY_PIN}`);
console.log('---------------------------------------------');

// 1. Inisialisasi Database SQLite Lokal
const db = new GatewayDatabase();

// 2. Inisialisasi Klien Komunikasi Cloud
const cloudClient = new CloudClient({
  cloudUrl: CLOUD_URL,
  apiKey: GATEWAY_API_KEY,
  roomCode: ROOM_CODE,
  version: '1.0.0',
});

// Status Sinkronisasi
let isOnline = false;
let lastSyncDate: Date | null = db.getLastSyncTime();
let syncError: string | undefined = undefined;

// 3. Inisialisasi MQTT Handler
const mqttHandler = new GatewayMqttHandler({
  mqttUrl: MQTT_URL,
  topicRoot: TOPIC_ROOT,
  roomCode: ROOM_CODE,
  db,
  pepper: CARD_PEPPER,
  onEvent: (evt) => {
    console.log(`[EVENT GATE] ${evt.method.toUpperCase()} -> ${evt.decision.action.toUpperCase()} (${evt.decision.code})`);
  },
});

// 4. Siklus Sinkronisasi Ketahanan (Resilience Worker Loop)
export async function runSyncCycle() {
  console.log(`[SYNC] Memulai siklus sinkronisasi gateway ke ${CLOUD_URL}...`);
  try {
    // A. Ambil snapshot data booking & kunci publik offline (GET /api/gateway/snapshot)
    const snapshotRes = await cloudClient.fetchSnapshot();
    if (snapshotRes.success && snapshotRes.data) {
      db.upsertSnapshot(snapshotRes.data);
      isOnline = true;
      lastSyncDate = new Date();
      syncError = undefined;
      console.log(`[SYNC SUKSES] Snapshot diperbarui (${snapshotRes.data.bookings?.length || 0} booking aktif di-cache)`);
    } else {
      isOnline = false;
      syncError = snapshotRes.error;
      console.warn(`[SYNC WARNING] Cloud tidak merespon: ${snapshotRes.error}. Melanjutkan mode OFFLINE cache.`);
    }

    // B. Kirimkan antrean log outbox ke cloud secara berkelompok (POST /api/gateway/logs)
    const unsentLogs = db.getUnsentLogs(50);
    if (unsentLogs.length > 0) {
      console.log(`[OUTBOX] Mengirim ${unsentLogs.length} log akses antrean ke cloud...`);
      const logsRes = await cloudClient.sendLogs(unsentLogs);
      if (logsRes.success && logsRes.acceptedIds) {
        db.markLogsSent(logsRes.acceptedIds);
        console.log(`[OUTBOX SUKSES] ${logsRes.acceptedIds.length} event log terkonfirmasi tersimpan di cloud`);
      }
    }

    // C. Perbarui heartbeat ke cloud (PUT /api/gateway/heartbeat)
    const unsentCount = db.getUnsentCount();
    await cloudClient.sendHeartbeat(unsentCount, lastSyncDate ? lastSyncDate.toISOString() : undefined);

    // D. Periksa antrean perintah admin (GET /api/gateway/commands)
    const cmdRes = await cloudClient.fetchCommands();
    if (cmdRes.success && cmdRes.commands && cmdRes.commands.length > 0) {
      for (const cmd of cmdRes.commands) {
        console.log(`[COMMAND CLOUD] Menjalankan perintah ${cmd.action} (ID: ${cmd.id})...`);
        if (cmd.action === 'remote_unlock') {
          const operatorName = cmd.payload?.operatorName || 'Admin Jarak Jauh';
          const holdMs = cmd.payload?.holdMs || 5000;
          mqttHandler.triggerRemoteUnlock(operatorName, holdMs);
        } else if (cmd.action === 'force_sync') {
          console.log('[COMMAND CLOUD] Perintah paksa sinkronisasi dijalankan');
        }

        // Konfirmasi perintah selesai (DELETE /api/gateway/commands/{id})
        await cloudClient.acknowledgeCommand(cmd.id);
        console.log(`[COMMAND CLOUD] Perintah ${cmd.id} berhasil dikonfirmasi dan dihapus dari antrean`);
      }
    }
  } catch (err: any) {
    isOnline = false;
    syncError = err.message;
    console.warn(`[SYNC EXCEPTION] Terjadi kendala jaringan: ${err.message}. Gateway tetap bekerja normal via SQLite cache.`);
  }
}

// Jalankan sinkronisasi awal dan berkala tiap 60 detik
runSyncCycle();
const syncTimer = setInterval(runSyncCycle, SYNC_INTERVAL_MS);

// 5. Jalankan Koneksi MQTT
mqttHandler.connect();

// 6. Jalankan Server Express Kiosk di Port 4000
const app = createKioskApp({
  port: PORT,
  roomCode: ROOM_CODE,
  emergencyPin: EMERGENCY_PIN,
  db,
  mqttHandler,
  getSyncStatus: () => ({ isOnline, lastSync: lastSyncDate, error: syncError }),
});

const server = app.listen(PORT, () => {
  console.log(`[KIOSK UI] Antarmuka Kiosk siap diakses di http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Mematikan Gateway...');
  clearInterval(syncTimer);
  mqttHandler.disconnect();
  db.close();
  server.close(() => {
    process.exit(0);
  });
});
