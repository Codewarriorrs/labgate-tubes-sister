import mqtt from 'mqtt';

const MQTT_URL = process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883';
const ROOM_CODE = process.env.ROOM_CODE || 'lab-01';
const TOPIC_ROOT = process.env.TOPIC_ROOT || `labgate/${ROOM_CODE}`;
const UID = process.argv[2] || '01020304'; // Default Kartu Biru Wokwi Isya
const SEQ = Math.floor(Math.random() * 1000) + 1;

console.log('=== SIMULASI PERANGKAT GATE RFID (scripts/simulate-scan.ts) ===');
console.log(`Broker MQTT : ${MQTT_URL}`);
console.log(`Topik Root  : ${TOPIC_ROOT}`);
console.log(`Ruangan     : ${ROOM_CODE}`);
console.log(`Sequence No : ${SEQ}`);
console.log(`UID Kartu   : ${UID}\n`);

const client = mqtt.connect(MQTT_URL, {
  clientId: `sim-scanner-${Math.random().toString(36).substring(2, 6)}`,
  clean: true,
});

let timeoutTimer: NodeJS.Timeout;

client.on('connect', () => {
  console.log('[MQTT] Terhubung ke broker. Mendengarkan balasan perintah pada topik: ' + `${TOPIC_ROOT}/cmd`);

  client.subscribe(`${TOPIC_ROOT}/cmd`, (err) => {
    if (err) {
      console.error('[MQTT Error] Gagal subscribe:', err);
      process.exit(1);
    }

    const scanPayload = {
      seq: SEQ,
      room: ROOM_CODE,
      method: 'rfid',
      uid: UID,
    };

    console.log('[PUBLISH SCAN] Mengirim payload ke ' + `${TOPIC_ROOT}/scan:`);
    console.log(JSON.stringify(scanPayload, null, 2));

    client.publish(`${TOPIC_ROOT}/scan`, JSON.stringify(scanPayload));

    timeoutTimer = setTimeout(() => {
      console.error('\n[TIMEOUT] Tidak menerima balasan perintah cmd dari Gateway dalam 5 detik.');
      console.log('Pastikan Service 2 (Gateway) sedang berjalan (npm run dev:gateway)');
      client.end();
      process.exit(1);
    }, 5000);
  });
});

client.on('message', (topic, payload) => {
  if (topic.toString() === `${TOPIC_ROOT}/cmd`) {
    try {
      const cmd = JSON.parse(payload.toString());
      if (cmd.seq === SEQ) {
        clearTimeout(timeoutTimer);
        console.log('\n[CMD BALASAN DITERIMA SESUAI SEQUENCE ID]');
        console.log(JSON.stringify(cmd, null, 2));

        if (cmd.action === 'open') {
          console.log(`\n🎉 HASIL: PINTU DIBUKA (Relay Aktif ${cmd.holdMs || 5000}ms)`);
          console.log(`Nama LCD: "${cmd.name}"`);
        } else {
          console.log(`\n⛔ HASIL: AKSES DITOLAK`);
          console.log(`Alasan LCD: "${cmd.reason}"`);
        }

        client.end();
        process.exit(0);
      }
    } catch (err: any) {
      console.error('Gagal parse pesan cmd:', err.message);
    }
  }
});
