import crypto from 'crypto';

const targetUrl = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000';
const cleanBaseUrl = targetUrl.replace(/\/+$/, '');
const DEMO_API_KEY = 'gw_lab01_secret_key_semarang_2026';
const ROOM_CODE = 'lab-01';

console.log('===============================================================');
console.log('        SKRIP VERIFIKASI DEPLOYMENT CLOUD (scripts/verify-deploy.ts) ');
console.log('===============================================================');
console.log(`Target Cloud URL : ${cleanBaseUrl}`);
console.log(`Demo API Key     : ${DEMO_API_KEY}`);
console.log(`Kode Ruangan     : ${ROOM_CODE}\n`);

async function runVerification() {
  let passedCount = 0;
  const totalChecks = 5;

  // 1. Periksa /api/health
  try {
    process.stdout.write('[1/5] Memeriksa status kesehatan cloud (GET /api/health)... ');
    const res = await fetch(`${cleanBaseUrl}/api/health`);
    const json = await res.json();
    if (res.ok && json.success) {
      console.log('PASSED (Healthy)');
      passedCount++;
    } else {
      console.log(`FAILED (${json.message || res.status})`);
    }
  } catch (err: any) {
    console.log(`FAILED (${err.message})`);
  }

  // 2. Periksa /api-docs (Swagger UI)
  try {
    process.stdout.write('[2/5] Memeriksa dokumentasi interaktif (GET /api-docs)... ');
    const res = await fetch(`${cleanBaseUrl}/api-docs`);
    if (res.ok) {
      console.log('PASSED (HTTP 200 OK)');
      passedCount++;
    } else {
      console.log(`FAILED (HTTP ${res.status})`);
    }
  } catch (err: any) {
    console.log(`FAILED (${err.message})`);
  }

  // 3. Siklus Komunikasi: GET /api/gateway/snapshot
  try {
    process.stdout.write('[3/5] Memeriksa siklus snapshot gateway (GET /api/gateway/snapshot)... ');
    const res = await fetch(`${cleanBaseUrl}/api/gateway/snapshot`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${DEMO_API_KEY}`,
      },
    });
    const json = await res.json();
    if (res.ok && json.success && json.data?.publicKey) {
      console.log(`PASSED (${json.data.bookings?.length || 0} booking aktif, Public Key valid)`);
      passedCount++;
    } else {
      console.log(`FAILED (${json.message || res.status})`);
    }
  } catch (err: any) {
    console.log(`FAILED (${err.message})`);
  }

  // 4. Siklus Komunikasi: POST /api/gateway/logs
  try {
    process.stdout.write('[4/5] Memeriksa pengiriman log akses (POST /api/gateway/logs)... ');
    const eventId = crypto.randomUUID();
    const res = await fetch(`${cleanBaseUrl}/api/gateway/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEMO_API_KEY}`,
      },
      body: JSON.stringify({
        logs: [
          {
            eventId,
            roomCode: ROOM_CODE,
            method: 'rfid',
            identifier: '01020304',
            result: 'granted',
            userName: 'Muhammad Isya Asyhari',
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    const json = await res.json();
    if (res.ok && json.success && json.data?.processed >= 1) {
      console.log('PASSED (Diproses secara idempoten)');
      passedCount++;
    } else {
      console.log(`FAILED (${json.message || res.status})`);
    }
  } catch (err: any) {
    console.log(`FAILED (${err.message})`);
  }

  // 5. Siklus Komunikasi: PUT /api/gateway/heartbeat
  try {
    process.stdout.write('[5/5] Memeriksa pembaruan heartbeat (PUT /api/gateway/heartbeat)... ');
    const res = await fetch(`${cleanBaseUrl}/api/gateway/heartbeat`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEMO_API_KEY}`,
      },
      body: JSON.stringify({
        roomCode: ROOM_CODE,
        version: '1.0.0',
        queueCount: 0,
        lastSync: new Date().toISOString(),
      }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      console.log('PASSED (Status Online Terkonfirmasi)');
      passedCount++;
    } else {
      console.log(`FAILED (${json.message || res.status})`);
    }
  } catch (err: any) {
    console.log(`FAILED (${err.message})`);
  }

  console.log('---------------------------------------------------------------');
  console.log(`HASIL VERIFIKASI: ${passedCount} / ${totalChecks} pengujian berhasil.`);

  if (passedCount === totalChecks) {
    console.log('🎉 SELURUH KETENTUAN DEPLOYMENT SERVICE CLOUD TERPENUHI & TERBUKTI!');
    process.exit(0);
  } else {
    console.error('⚠️ Beberapa pengujian gagal. Periksa URL atau konfigurasi environment.');
    process.exit(1);
  }
}

runVerification();
