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

  // 5. POST /api/scan (Validasi Scan Tiket QR atau Kartu RFID)
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

  // 6. UI Kiosk Webpage (HTML + Universal jsQR Camera Scanner + Status Realtime)
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
  <!-- Library Universal QR Decoder (Bekerja di seluruh browser tanpa flag khusus) -->
  <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
  <style>
    body { background-color: #F8F9FA; color: #1A1A1A; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .scan-guide {
      border: 2px dashed #0066FF;
      animation: pulseBorder 2s infinite ease-in-out;
    }
    @keyframes pulseBorder {
      0%, 100% { border-color: rgba(0, 102, 255, 0.4); }
      50% { border-color: rgba(0, 102, 255, 0.9); }
    }
    .flat-btn-primary {
      background-color: #1A1A1A;
      color: #FFFFFF;
      font-weight: 600;
      border-radius: 4px;
      border: 1px solid #1A1A1A;
      transition: all 150ms ease;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .flat-btn-primary:hover { background-color: #333333; }
    .flat-btn-primary:active { transform: translateY(1px); }

    .flat-btn-secondary {
      background-color: #FFFFFF;
      color: #1A1A1A;
      font-weight: 600;
      border-radius: 4px;
      border: 1px solid #D1D5DB;
      transition: all 150ms ease;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .flat-btn-secondary:hover { background-color: #F3F4F6; }
    .flat-btn-secondary:active { transform: translateY(1px); }
  </style>
</head>
<body class="min-h-[100dvh] flex flex-col justify-between p-4 sm:p-6 select-none">
  <!-- Top Bar: Status Gate, Sync, & Emergency PIN -->
  <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-[#E5E7EB] rounded-[4px] px-5 py-4 gap-3">
    <div class="flex items-center space-x-3">
      <div class="w-10 h-10 rounded-[4px] bg-[#1A1A1A] flex items-center justify-center font-bold text-base text-white shrink-0">
        LG
      </div>
      <div>
        <h1 class="font-bold text-base text-[#1A1A1A] tracking-tight leading-tight">Gate Laboratorium &bull; ${roomCode}</h1>
        <p class="text-[11px] text-[#4A4A4A]">LabGate Edge Gateway Service &bull; Standalone Offline Resilient</p>
      </div>
    </div>

    <div class="flex items-center space-x-2 sm:space-x-3 text-xs w-full sm:w-auto justify-between sm:justify-end">
      <div class="flex items-center space-x-2 bg-[#F8F9FA] px-3 py-1.5 rounded-[4px] border border-[#E5E7EB]">
        <span id="networkDot" class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span id="networkStatus" class="font-bold text-emerald-700">Online</span>
      </div>

      <div class="hidden md:block text-right">
        <span id="lastSyncText" class="text-[#4A4A4A] block text-[11px]">Sinkron: Memuat...</span>
        <span id="outboxCount" class="text-[#0066FF] font-semibold block text-[11px]">Outbox: 0 event</span>
      </div>

      <button onclick="openPinModal()" class="flat-btn-secondary px-3 py-1.5 text-xs">
        Emergency PIN (1722)
      </button>
    </div>
  </header>

  <!-- Main Grid: Scanner & Instruksi -->
  <main class="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1 items-center">
    <!-- Kolom Kiri: Kamera Webcam Scanner QR -->
    <div class="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-[4px] p-5 flex flex-col items-center space-y-3">
      <div class="w-full flex justify-between items-center text-xs">
        <span class="font-bold uppercase tracking-wider text-[11px] text-[#0066FF]">Kamera Scanner Tiket QR</span>
        <span id="camStatus" class="text-[11px] text-[#4A4A4A]">Menyiapkan webcam...</span>
      </div>

      <div class="relative w-full aspect-square max-w-sm rounded-[4px] overflow-hidden bg-black flex items-center justify-center border border-[#E5E7EB]">
        <video id="webcamVideo" autoplay playsinline muted class="w-full h-full object-cover"></video>
        <canvas id="qrCanvas" class="hidden"></canvas>
        <div class="absolute inset-8 scan-guide rounded-[4px] pointer-events-none flex items-center justify-center">
          <span class="text-[11px] text-white font-semibold bg-[#1A1A1A]/80 px-3 py-1 rounded-[2px]">Arahkan Tiket QR ke Sini</span>
        </div>
      </div>

      <p class="text-[11px] text-[#4A4A4A] text-center">
        Dekoder kamera membaca tiket QR ber-tanda tangan Ed25519 langsung secara offline
      </p>

      <!-- Input Manual / Paste Token QR untuk Kemudahan Pengujian -->
      <div class="w-full pt-3 border-t border-[#E5E7EB] space-y-2">
        <div class="flex items-center space-x-2">
          <input
            id="manualQrInput"
            type="text"
            placeholder="Atau tempel/paste token QR di sini..."
            class="flex-1 px-3 py-1.5 border border-[#D1D5DB] rounded-[4px] font-mono text-xs focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
          />
          <button onclick="submitManualQr()" class="flat-btn-primary px-3 py-1.5 text-xs">
            Validasi QR
          </button>
        </div>
      </div>
    </div>

    <!-- Kolom Kanan: Status & Hasil Verifikasi Pintu -->
    <div class="lg:col-span-7 flex flex-col justify-center space-y-4">
      <!-- Big Decision Display Card -->
      <div id="decisionCard" class="bg-white border border-[#E5E7EB] rounded-[4px] p-8 transition-all duration-200 text-center space-y-3 min-h-[260px] flex flex-col justify-center items-center">
        <div id="decisionIcon" class="w-16 h-16 rounded-[4px] bg-[#F8F9FA] border border-[#E5E7EB] flex items-center justify-center text-3xl mb-1 text-[#1A1A1A]">
          🚪
        </div>
        <h2 id="decisionTitle" class="text-2xl font-bold text-[#1A1A1A] tracking-tight">
          Tempelkan KTM atau Tunjukkan QR
        </h2>
        <p id="decisionDesc" class="text-xs text-[#4A4A4A] max-w-md">
          Akses pintu tervalidasi secara instan menggunakan RFID atau tiket QR. Tetap berfungsi penuh saat internet offline.
        </p>
        <div id="remainingBadge" class="hidden px-3 py-1 bg-white border border-[#16A34A] text-[#16A34A] rounded-[2px] text-xs font-mono font-bold">
          Sisa Waktu Booking: <span id="remainingTime">-</span>
        </div>
      </div>

      <!-- Quick Scan RFID Mock untuk Pengujian Cepat di Laptop -->
      <div class="bg-white border border-[#E5E7EB] rounded-[4px] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[#4A4A4A] font-semibold">Simulasi Kartu:</span>
          <button onclick="testRfid('01020304')" class="flat-btn-primary px-3 py-1.5 text-xs">
            Tap KTM Isya (01020304)
          </button>
          <button onclick="testRfid('99999999')" class="flat-btn-secondary px-3 py-1.5 text-xs">
            Tap Kartu Asing (99999999)
          </button>
        </div>
        <span class="text-[11px] text-[#4A4A4A]">Mendukung Tap Wokwi (MQTT) & Direct Web</span>
      </div>
    </div>
  </main>

  <!-- Bottom: 20 Log Terakhir -->
  <footer class="bg-white border border-[#E5E7EB] rounded-[4px] p-4 text-xs">
    <div class="flex justify-between items-center mb-2.5">
      <span class="font-bold text-[#1A1A1A] text-xs uppercase tracking-wider">20 Aktivitas Scan Terakhir (SQLite Lokal)</span>
      <span class="text-[11px] text-[#4A4A4A]">Auto-update berkala</span>
    </div>
    <div class="overflow-x-auto max-h-36 overflow-y-auto">
      <table class="w-full text-left text-[11px] text-[#1A1A1A]">
        <thead class="text-[#4A4A4A] font-semibold uppercase text-[10px] border-b border-[#E5E7EB] bg-[#F8F9FA]">
          <tr>
            <th class="py-1.5 px-3">Waktu</th>
            <th class="py-1.5 px-3">Metode</th>
            <th class="py-1.5 px-3">Nama / Identitas</th>
            <th class="py-1.5 px-3">Status</th>
            <th class="py-1.5 px-3">Keterangan</th>
          </tr>
        </thead>
        <tbody id="logsTableBody" class="divide-y divide-[#E5E7EB]">
          <tr><td colspan="5" class="py-3 text-center text-[#4A4A4A]">Memuat log...</td></tr>
        </tbody>
      </table>
    </div>
  </footer>

  <!-- Modal Emergency PIN -->
  <div id="pinModal" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <div class="bg-white border border-[#E5E7EB] rounded-[4px] p-6 max-w-sm w-full text-center space-y-4">
      <h3 class="font-bold text-base text-[#1A1A1A]">Emergency Manual PIN</h3>
      <p class="text-xs text-[#4A4A4A]">Masukkan kode PIN petugas piket untuk membuka pintu darurat</p>
      <input id="pinInput" type="password" maxlength="6" placeholder="PIN (1722)" class="w-full text-center tracking-widest text-xl py-2 bg-white border border-[#D1D5DB] rounded-[4px] text-[#1A1A1A] font-mono focus:outline-none focus:border-[#0066FF]">
      <div class="flex space-x-2 pt-2 text-xs">
        <button onclick="closePinModal()" class="flat-btn-secondary flex-1 py-2 text-xs">Batal</button>
        <button onclick="submitPin()" class="flat-btn-primary flex-1 py-2 text-xs">Buka Pintu</button>
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
          netStatus.className = 'font-bold text-emerald-700';
          netStatus.innerText = 'Online';
        } else {
          netDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500';
          netStatus.className = 'font-bold text-amber-700';
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
              <tr class="hover:bg-[#F8F9FA]">
                <td class="py-1.5 px-3 font-mono text-[10px]">\${time}</td>
                <td class="py-1.5 px-3 uppercase text-[10px] font-semibold">\${l.method}</td>
                <td class="py-1.5 px-3 font-semibold text-[#1A1A1A]">\${l.userName || l.identifier}</td>
                <td class="py-1.5 px-3 font-mono text-[10px] font-bold \${isGranted ? 'text-emerald-700' : 'text-red-700'}">[\${isGranted ? 'DITERIMA' : 'DITOLAK'}]</td>
                <td class="py-1.5 px-3 text-[#4A4A4A] text-[10px]">\${l.reason || '-'}</td>
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
        card.className = 'bg-[#DCFCE7] border border-[#86EFAC] rounded-[4px] p-8 text-center space-y-3 min-h-[260px] flex flex-col justify-center items-center';
        icon.className = 'w-16 h-16 rounded-[4px] bg-white border border-[#86EFAC] text-emerald-800 flex items-center justify-center text-3xl mb-1';
        icon.innerText = '✅';
        title.innerText = 'AKSES DITERIMA';
        title.className = 'text-2xl font-bold text-emerald-900 tracking-tight';
        desc.innerText = 'Silakan masuk, ' + (result.name || 'Pengguna');
        desc.className = 'text-xs text-emerald-800 font-semibold max-w-md';
        if (result.remainingMinutes !== undefined) {
          badge.className = 'px-3 py-1 bg-white border border-[#16A34A] text-emerald-900 rounded-[2px] text-xs font-mono font-bold';
          document.getElementById('remainingTime').innerText = result.remainingMinutes + ' menit';
        }
      } else {
        card.className = 'bg-[#FEE2E2] border border-[#FCA5A5] rounded-[4px] p-8 text-center space-y-3 min-h-[260px] flex flex-col justify-center items-center';
        icon.className = 'w-16 h-16 rounded-[4px] bg-white border border-[#FCA5A5] text-red-800 flex items-center justify-center text-3xl mb-1';
        icon.innerText = '⛔';
        title.innerText = 'AKSES DITOLAK';
        title.className = 'text-2xl font-bold text-red-900 tracking-tight';
        desc.innerText = result.reason || result.message || 'Tidak memiliki izin akses';
        desc.className = 'text-xs text-red-800 font-semibold max-w-md';
        badge.className = 'hidden';
      }

      resetTimer = setTimeout(() => {
        card.className = 'bg-white border border-[#E5E7EB] rounded-[4px] p-8 text-center space-y-3 min-h-[260px] flex flex-col justify-center items-center';
        icon.className = 'w-16 h-16 rounded-[4px] bg-[#F8F9FA] border border-[#E5E7EB] flex items-center justify-center text-3xl mb-1 text-[#1A1A1A]';
        icon.innerText = '🚪';
        title.innerText = 'Tempelkan KTM atau Tunjukkan QR';
        title.className = 'text-2xl font-bold text-[#1A1A1A] tracking-tight';
        desc.innerText = 'Akses pintu tervalidasi secara instan menggunakan RFID atau tiket QR. Tetap berfungsi penuh saat internet offline.';
        desc.className = 'text-xs text-[#4A4A4A] max-w-md';
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

    // Manual QR Input Submit
    async function submitManualQr() {
      const val = document.getElementById('manualQrInput').value.trim();
      if (!val) return;
      handleQrDetected(val);
      document.getElementById('manualQrInput').value = '';
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

    // Universal Webcam Video Stream & jsQR Decoding
    let scanning = false;
    async function startWebcam() {
      const video = document.getElementById('webcamVideo');
      const canvas = document.getElementById('qrCanvas');
      const ctx = canvas.getContext('2d');
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
        camStatus.innerText = 'Kamera Aktif (Scanning...)';

        // Loop continuous decoding via jsQR
        function tick() {
          if (video.readyState === video.HAVE_ENOUGH_DATA && !scanning) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            if (window.jsQR) {
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });

              if (code && code.data && code.data.trim().length > 0) {
                handleQrDetected(code.data.trim());
              }
            }
          }
          requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
      } catch (err) {
        camStatus.innerText = 'Izin kamera ditolak / Kamera tidak aktif';
      }
    }

    async function handleQrDetected(qrString) {
      if (scanning) return;
      scanning = true;
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'qr', payload: qrString })
        });
        const json = await res.json();
        showDecision(json);
      } catch (err) {
        console.error(err);
      }
      setTimeout(() => { scanning = false; }, 3500);
    }

    window.addEventListener('load', startWebcam);
  </script>
</body>
</html>`;
}
