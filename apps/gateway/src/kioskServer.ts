import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { GatewayDatabase } from './sqliteDb';
import { evaluateAccess, DecisionContext } from './decisionEngine';
import { GatewayMqttHandler } from './mqttHandler';

export interface KioskServerConfig {
  port: number;
  roomCode: string;
  emergencyPin: string;
  db: GatewayDatabase;
  mqttHandler: GatewayMqttHandler;
  getSyncStatus: () => { isOnline: boolean; lastSync: Date | null; error?: string };
}

export function createKioskApp(config: KioskServerConfig) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 1. GET /health
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'LabGate Local Gateway',
      roomCode: config.roomCode,
      port: config.port,
      timestamp: new Date().toISOString(),
    });
  });

  // 2. GET /status
  app.get('/status', (req, res) => {
    const sync = config.getSyncStatus();
    const unsentCount = config.db.getUnsentCount();
    const cachedBookings = config.db.getCachedBookings();
    const mqttStatus = config.mqttHandler.getStatus();

    res.json({
      roomCode: config.roomCode,
      online: sync.isOnline,
      lastSync: sync.lastSync ? sync.lastSync.toISOString() : null,
      syncError: sync.error || null,
      unsentLogsCount: unsentCount,
      cachedBookingsCount: cachedBookings.length,
      mqtt: mqttStatus,
    });
  });

  // 3. GET /logs (20 log terakhir di SQLite lokal)
  app.get('/logs', (req, res) => {
    const recentLogs = config.db.getRecentLogs(20);
    res.json({
      success: true,
      data: recentLogs,
    });
  });

  // 4. POST /manual-override (Emergency PIN Petugas)
  app.post('/manual-override', async (req, res) => {
    const { pin } = req.body;
    const context: DecisionContext = {
      roomCode: config.roomCode,
      currentTime: new Date(),
      cachedBookings: config.db.getCachedBookings(),
      emergencyPin: config.emergencyPin,
    };

    const decision = await evaluateAccess('manual_pin', pin || '', context);

    if (decision.action === 'open') {
      config.mqttHandler.triggerRemoteUnlock('Petugas Piket', 5000);

      const eventId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      config.db.enqueueLog({
        eventId,
        roomCode: config.roomCode,
        method: 'manual_pin',
        identifier: 'PIN-1722',
        result: 'granted',
        userName: 'Petugas Piket (Emergency)',
        timestamp,
      });

      return res.json({
        success: true,
        action: 'open',
        name: 'Petugas Piket',
        message: 'Akses darurat disetujui. Solenoid pintu terbuka selama 5 detik.',
      });
    } else {
      return res.status(403).json({
        success: false,
        action: 'deny',
        message: 'PIN Darurat salah. Akses ditolak.',
      });
    }
  });

  // 5. POST /api/scan (Validasi Scan Tiket QR dari Kamera Device Laptop)
  app.post('/api/scan', async (req, res) => {
    const { method, payload } = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Payload scan wajib diisi' });
    }

    const bookings = config.db.getCachedBookings();
    const publicKey = config.db.getPublicKey();
    const lastSync = config.db.getLastSyncTime();

    const context: DecisionContext = {
      roomCode: config.roomCode,
      currentTime: new Date(),
      cachedBookings: bookings,
      cachedPublicKey: publicKey,
      lastSyncTime: lastSync,
    };

    const decision = await evaluateAccess(method || 'qr', payload, context);

    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    if (decision.action === 'open') {
      config.mqttHandler.triggerRemoteUnlock(decision.name || 'Mahasiswa QR', decision.holdMs || 5000);
      config.db.enqueueLog({
        eventId,
        roomCode: config.roomCode,
        method: method || 'qr',
        identifier: payload.substring(0, 32),
        result: 'granted',
        userName: decision.name,
        timestamp,
      });

      return res.json({
        success: true,
        action: 'open',
        name: decision.name,
        remainingMinutes: decision.remainingMinutes,
        message: `Akses Diterima! Selamat datang, ${decision.name}`,
      });
    } else {
      config.db.enqueueLog({
        eventId,
        roomCode: config.roomCode,
        method: method || 'qr',
        identifier: payload.substring(0, 32),
        result: 'denied',
        reason: decision.reason,
        timestamp,
      });

      return res.json({
        success: false,
        action: 'deny',
        reason: decision.reason,
        message: `Akses Ditolak: ${decision.reason}`,
      });
    }
  });

  // 6. UI Kiosk Webpage (HTML + Kamera Webcam Scanner + Status Realtime)
  app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(getKioskHtml(config.roomCode));
  });

  return app;
}

function getKioskHtml(roomCode: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LabGate Kiosk - ${roomCode}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #ddf4ff; color: #3c3c3c; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .scan-guide {
      border: 3px dashed #0f766e;
      animation: pulseBorder 2s infinite ease-in-out;
    }
    @keyframes pulseBorder {
      0%, 100% { border-color: rgba(15, 118, 110, 0.4); }
      50% { border-color: rgba(15, 118, 110, 0.9); }
    }
    .duo-btn-primary {
      background-color: #0f766e;
      color: #ffffff;
      font-weight: 800;
      border-radius: 12px;
      border-bottom: 4px solid #134e4a;
      transition: all 0.15s ease;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .duo-btn-primary:hover { background-color: #115e59; }
    .duo-btn-primary:active { border-bottom-width: 0px; transform: translateY(4px); }

    .duo-btn-secondary {
      background-color: #ffffff;
      color: #3c3c3c;
      font-weight: 800;
      border-radius: 12px;
      border: 2px solid #bae6fd;
      border-bottom: 4px solid #7dd3fc;
      transition: all 0.15s ease;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .duo-btn-secondary:hover { background-color: #f0f9ff; }
    .duo-btn-secondary:active { border-bottom-width: 2px; transform: translateY(2px); }
  </style>
</head>
<body class="min-h-[100dvh] flex flex-col justify-between p-4 sm:p-6 select-none">
  <!-- Top Bar: Status Gate, Sync, & Jam -->
  <header class="flex justify-between items-center bg-white border-2 border-[#bae6fd] rounded-2xl px-6 py-4 shadow-sm">
    <div class="flex items-center space-x-3">
      <div class="w-11 h-11 rounded-2xl bg-[#0f766e] border-b-4 border-[#134e4a] flex items-center justify-center font-extrabold text-lg text-white shadow-sm">
        LG
      </div>
      <div>
        <h1 class="font-extrabold text-base text-[#3c3c3c] tracking-tight leading-tight">Gate Laboratorium &bull; ${roomCode}</h1>
        <p class="text-[11px] text-[#777777] font-bold">LabGate Edge Gateway Service</p>
      </div>
    </div>

    <div class="flex items-center space-x-3 sm:space-x-4 text-xs">
      <div class="flex items-center space-x-2 bg-[#ddf4ff] px-3 py-1.5 rounded-xl border border-[#bae6fd]">
        <span id="networkDot" class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span id="networkStatus" class="font-extrabold text-emerald-800">Online</span>
      </div>

      <div class="hidden sm:block text-right">
        <span id="lastSyncText" class="text-[#777777] block text-[11px] font-medium">Sinkron: Memuat...</span>
        <span id="outboxCount" class="text-[#0f766e] font-extrabold block text-[11px]">Outbox: 0 event</span>
      </div>

      <button onclick="openPinModal()" class="duo-btn-secondary px-3 py-1.5 text-xs font-extrabold">
        Emergency PIN
      </button>
    </div>
  </header>

  <!-- Main Grid: Scanner & Instruksi -->
  <main class="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1 items-center">
    <!-- Kolom Kiri: Kamera Webcam Scanner QR -->
    <div class="lg:col-span-5 bg-white border-2 border-[#bae6fd] rounded-3xl p-5 shadow-sm flex flex-col items-center">
      <div class="w-full flex justify-between items-center mb-3 text-xs">
        <span class="font-extrabold uppercase tracking-wider text-[11px] text-[#0f766e]">Kamera Scanner Tiket QR</span>
        <span id="camStatus" class="text-[11px] text-[#777777] font-medium">Menyiapkan webcam...</span>
      </div>

      <div class="relative w-full aspect-square max-w-sm rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border-2 border-[#bae6fd]">
        <video id="webcamVideo" autoplay playsinline muted class="w-full h-full object-cover"></video>
        <div class="absolute inset-8 scan-guide rounded-2xl pointer-events-none flex items-center justify-center">
          <span class="text-[11px] text-white font-extrabold bg-[#0f766e]/90 px-3.5 py-1.5 rounded-xl shadow">Arahkan Tiket QR ke Sini</span>
        </div>
      </div>

      <p class="text-[11px] text-[#777777] text-center mt-3 font-medium">
        Kamera laptop membaca tiket QR ber-tanda tangan Ed25519 langsung secara offline
      </p>
    </div>

    <!-- Kolom Kanan: Status & Hasil Verifikasi Pintu -->
    <div class="lg:col-span-7 flex flex-col justify-center space-y-4">
      <!-- Big Decision Display Card -->
      <div id="decisionCard" class="bg-white border-2 border-[#bae6fd] rounded-3xl p-8 shadow-sm transition-all duration-300 text-center space-y-4 min-h-[280px] flex flex-col justify-center items-center">
        <div id="decisionIcon" class="w-20 h-20 rounded-2xl bg-[#ddf4ff] border-2 border-[#bae6fd] flex items-center justify-center text-4xl mb-2 text-[#0f766e]">
          🚪
        </div>
        <h2 id="decisionTitle" class="text-2xl font-extrabold text-[#3c3c3c] tracking-tight">
          Tempelkan KTM atau Tunjukkan QR
        </h2>
        <p id="decisionDesc" class="text-xs text-[#777777] max-w-md font-medium">
          Akses pintu tervalidasi secara instan menggunakan RFID atau tiket QR. Tetap berfungsi penuh saat internet kampus mati.
        </p>
        <div id="remainingBadge" class="hidden px-4 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-full text-xs font-extrabold">
          Sisa Waktu Booking: <span id="remainingTime">-</span>
        </div>
      </div>

      <!-- Quick Scan RFID Mock untuk Pengujian Cepat di Laptop -->
      <div class="bg-white border-2 border-[#bae6fd] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex items-center space-x-2">
          <span class="text-[#777777] font-bold">Simulasi Kartu:</span>
          <button onclick="testRfid('01020304')" class="duo-btn-primary px-3 py-1.5 text-xs">
            Tap KTM Isya (01020304)
          </button>
          <button onclick="testRfid('99999999')" class="duo-btn-secondary px-3 py-1.5 text-xs">
            Tap Kartu Asing (99999999)
          </button>
        </div>
        <span class="text-[11px] text-[#777777] font-medium">Mendukung Tap Wokwi (MQTT) & Direct Web</span>
      </div>
    </div>
  </main>

  <!-- Bottom: 20 Log Terakhir -->
  <footer class="bg-white border-2 border-[#bae6fd] rounded-2xl p-4 shadow-sm text-xs">
    <div class="flex justify-between items-center mb-2.5">
      <span class="font-extrabold text-[#3c3c3c] text-xs uppercase tracking-wider">20 Aktivitas Scan Terakhir (SQLite Lokal)</span>
      <span class="text-[11px] text-[#777777] font-medium">Auto-update berkala</span>
    </div>
    <div class="overflow-x-auto max-h-36 overflow-y-auto">
      <table class="w-full text-left text-[11px] text-[#3c3c3c]">
        <thead class="text-[#777777] font-extrabold uppercase text-[10px] border-b-2 border-slate-100 bg-[#f0f9ff]">
          <tr>
            <th class="py-1.5 px-3">Waktu</th>
            <th class="py-1.5 px-3">Metode</th>
            <th class="py-1.5 px-3">Nama / Identitas</th>
            <th class="py-1.5 px-3">Status</th>
            <th class="py-1.5 px-3">Keterangan</th>
          </tr>
        </thead>
        <tbody id="logsTableBody" class="divide-y divide-slate-100 font-medium">
          <tr><td colspan="5" class="py-3 text-center text-[#777777]">Memuat log...</td></tr>
        </tbody>
      </table>
    </div>
  </footer>

  <!-- Modal Emergency PIN -->
  <div id="pinModal" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white border-2 border-[#bae6fd] rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
      <h3 class="font-extrabold text-base text-[#3c3c3c]">Emergency Manual PIN</h3>
      <p class="text-xs text-[#777777] font-medium">Masukkan kode PIN petugas piket untuk membuka pintu darurat</p>
      <input id="pinInput" type="password" maxlength="6" placeholder="PIN (1722)" class="w-full text-center tracking-widest text-xl py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-[#3c3c3c] font-bold focus:outline-none focus:border-[#0f766e]">
      <div class="flex space-x-2 pt-2 text-xs">
        <button onclick="closePinModal()" class="duo-btn-secondary flex-1 py-2 text-xs">Batal</button>
        <button onclick="submitPin()" class="duo-btn-primary flex-1 py-2 text-xs">Buka Pintu</button>
      </div>
    </div>
  </div>

  <script>
    // Status polling
    async function updateStatus() {
      try {
        const res = await fetch('/status');
        const data = await res.json();

        const netDot = document.getElementById('networkDot');
        const netStatus = document.getElementById('networkStatus');
        const lastSync = document.getElementById('lastSyncText');
        const outbox = document.getElementById('outboxCount');

        if (data.online) {
          netDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
          netStatus.className = 'font-extrabold text-emerald-800';
          netStatus.innerText = 'Online';
        } else {
          netDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500';
          netStatus.className = 'font-extrabold text-amber-800';
          netStatus.innerText = 'Offline (Cache Aktif)';
        }

        if (data.lastSync) {
          const d = new Date(data.lastSync);
          lastSync.innerText = 'Sinkron: ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        } else {
          lastSync.innerText = 'Sinkron: Belum pernah';
        }

        outbox.innerText = 'Outbox: ' + data.unsentLogsCount + ' event';
      } catch (err) {
        console.error(err);
      }
    }

    async function updateLogs() {
      try {
        const res = await fetch('/logs');
        const json = await res.json();
        const tbody = document.getElementById('logsTableBody');
        if (json.data && json.data.length > 0) {
          tbody.innerHTML = json.data.map(l => {
            const time = new Date(l.timestamp).toLocaleTimeString('id-ID');
            const isGranted = l.result === 'granted';
            return \`
              <tr class="hover:bg-[#ddf4ff]/20">
                <td class="py-1.5 px-3 font-mono text-[10px]">\${time}</td>
                <td class="py-1.5 px-3 uppercase text-[10px] font-extrabold">\${l.method}</td>
                <td class="py-1.5 px-3 font-bold text-[#3c3c3c]">\${l.userName || l.identifier}</td>
                <td class="py-1.5 px-3 font-extrabold \${isGranted ? 'text-emerald-700' : 'text-red-700'}">\${isGranted ? 'Diterima' : 'Ditolak'}</td>
                <td class="py-1.5 px-3 text-[#777777] text-[10px]">\${l.reason || '-'}</td>
              </tr>
            \`;
          }).join('');
        }
      } catch (err) {}
    }

    setInterval(updateStatus, 3000);
    setInterval(updateLogs, 3000);
    updateStatus();
    updateLogs();

    // Decision display handler
    let resetTimer = null;
    function showDecision(result) {
      const card = document.getElementById('decisionCard');
      const icon = document.getElementById('decisionIcon');
      const title = document.getElementById('decisionTitle');
      const desc = document.getElementById('decisionDesc');
      const badge = document.getElementById('remainingBadge');

      if (resetTimer) clearTimeout(resetTimer);

      if (result.action === 'open') {
        card.className = 'bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-8 shadow-sm text-center space-y-4 min-h-[280px] flex flex-col justify-center items-center';
        icon.className = 'w-20 h-20 rounded-2xl bg-emerald-100 border-2 border-emerald-300 text-emerald-800 flex items-center justify-center text-4xl mb-2';
        icon.innerText = '✅';
        title.innerText = 'AKSES DITERIMA';
        title.className = 'text-2xl font-extrabold text-emerald-900 tracking-tight';
        desc.innerText = 'Silakan masuk, ' + (result.name || 'Pengguna');
        desc.className = 'text-sm text-emerald-800 font-bold max-w-md';
        if (result.remainingMinutes !== undefined) {
          badge.className = 'px-4 py-1.5 bg-emerald-100 border border-emerald-400 text-emerald-900 rounded-full text-xs font-extrabold';
          document.getElementById('remainingTime').innerText = result.remainingMinutes + ' menit';
        }
      } else {
        card.className = 'bg-red-50 border-2 border-red-400 rounded-3xl p-8 shadow-sm text-center space-y-4 min-h-[280px] flex flex-col justify-center items-center';
        icon.className = 'w-20 h-20 rounded-2xl bg-red-100 border-2 border-red-300 text-red-800 flex items-center justify-center text-4xl mb-2';
        icon.innerText = '⛔';
        title.innerText = 'AKSES DITOLAK';
        title.className = 'text-2xl font-extrabold text-red-900 tracking-tight';
        desc.innerText = result.reason || result.message || 'Tidak memiliki izin akses';
        desc.className = 'text-sm text-red-800 font-bold max-w-md';
        badge.className = 'hidden';
      }

      resetTimer = setTimeout(() => {
        card.className = 'bg-white border-2 border-[#bae6fd] rounded-3xl p-8 shadow-sm text-center space-y-4 min-h-[280px] flex flex-col justify-center items-center';
        icon.className = 'w-20 h-20 rounded-2xl bg-[#ddf4ff] border-2 border-[#bae6fd] flex items-center justify-center text-4xl mb-2 text-[#0f766e]';
        icon.innerText = '🚪';
        title.innerText = 'Tempelkan KTM atau Tunjukkan QR';
        title.className = 'text-2xl font-extrabold text-[#3c3c3c] tracking-tight';
        desc.innerText = 'Akses pintu tervalidasi secara instan menggunakan RFID atau tiket QR. Tetap berfungsi penuh saat internet offline.';
        desc.className = 'text-xs text-[#777777] max-w-md font-medium';
        badge.className = 'hidden';
      }, 5000);

      updateLogs();
    }

    // Direct Test RFID
    async function testRfid(uid) {
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'rfid', payload: uid })
        });
        const json = await res.json();
        showDecision(json);
      } catch (err) {
        alert('Gagal test RFID');
      }
    }

    // Modal PIN
    function openPinModal() {
      document.getElementById('pinModal').classList.remove('hidden');
      document.getElementById('pinInput').value = '';
      document.getElementById('pinInput').focus();
    }
    function closePinModal() {
      document.getElementById('pinModal').classList.add('hidden');
    }
    async function submitPin() {
      const pin = document.getElementById('pinInput').value;
      try {
        const res = await fetch('/manual-override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        const json = await res.json();
        closePinModal();
        showDecision(json);
      } catch (err) {
        alert('Gagal kirim PIN');
      }
    }

    // Webcam Video Stream & Barcode Detection
    let scanning = false;
    async function startWebcam() {
      const video = document.getElementById('webcamVideo');
      const camStatus = document.getElementById('camStatus');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        camStatus.innerText = 'Webcam tidak didukung browser ini';
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
        });
        video.srcObject = stream;
        camStatus.innerText = 'Kamera Aktif';
        initBarcodeDetector(video);
      } catch (err) {
        camStatus.innerText = 'Izin kamera ditolak / tidak ditemukan';
      }
    }

    function initBarcodeDetector(video) {
      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        setInterval(async () => {
          if (video.readyState === video.HAVE_ENOUGH_DATA && !scanning) {
            try {
              const barcodes = await detector.detect(video);
              if (barcodes.length > 0) {
                const qrRawValue = barcodes[0].rawValue;
                handleQrDetected(qrRawValue);
              }
            } catch (e) {}
          }
        }, 500);
      } else {
        document.getElementById('camStatus').innerText = 'Kamera Aktif (Native QR Scanner)';
      }
    }

    async function handleQrDetected(qrString) {
      scanning = true;
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'qr', payload: qrString })
        });
        const json = await res.json();
        showDecision(json);
      } catch (err) {}
      setTimeout(() => { scanning = false; }, 4000);
    }

    window.addEventListener('load', startWebcam);
  </script>
</body>
</html>`;
}
