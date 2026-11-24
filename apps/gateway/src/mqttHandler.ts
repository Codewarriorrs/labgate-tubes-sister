import mqtt from 'mqtt';
import crypto from 'crypto';
import { GatewayDatabase } from './sqliteDb';
import { evaluateAccess, DecisionContext } from './decisionEngine';
import { MqttScanMessage, MqttCmdMessage } from './types';

export interface MqttHandlerConfig {
  mqttUrl: string;
  topicRoot: string;
  roomCode: string;
  db: GatewayDatabase;
  pepper?: string;
  onEvent?: (event: any) => void;
}

export class GatewayMqttHandler {
  private client: mqtt.MqttClient | null = null;
  private config: MqttHandlerConfig;
  private db: GatewayDatabase;
  private isConnected = false;

  constructor(config: MqttHandlerConfig) {
    this.config = config;
    this.db = config.db;
  }

  public connect() {
    console.log(`[MQTT] Menghubungkan ke broker ${this.config.mqttUrl}...`);
    this.client = mqtt.connect(this.config.mqttUrl, {
      clientId: `gateway-${this.config.roomCode}-${Math.random().toString(36).substring(2, 7)}`,
      reconnectPeriod: 3000,
      clean: true,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log(`[MQTT] Terhubung ke Broker! Subscribe topik ${this.config.topicRoot}/#`);
      this.client?.subscribe([
        `${this.config.topicRoot}/scan`,
        `${this.config.topicRoot}/status`,
      ]);
    });

    this.client.on('error', (err) => {
      console.error('[MQTT Error]', err.message);
    });

    this.client.on('close', () => {
      this.isConnected = false;
    });

    this.client.on('message', async (topic, payload) => {
      const topicStr = topic.toString();
      const messageStr = payload.toString();

      if (topicStr.endsWith('/scan')) {
        await this.handleScan(messageStr);
      } else if (topicStr.endsWith('/status')) {
        console.log(`[MQTT Perangkat Status]`, messageStr);
      }
    });
  }

  private async handleScan(messageStr: string) {
    try {
      const scan: MqttScanMessage = JSON.parse(messageStr);
      console.log(`[MQTT SCAN] seq=${scan.seq} room=${scan.room} uid=${scan.uid}`);

      const bookings = this.db.getCachedBookings();
      const publicKey = this.db.getPublicKey();
      const lastSync = this.db.getLastSyncTime();

      const context: DecisionContext = {
        roomCode: this.config.roomCode,
        currentTime: new Date(),
        cachedBookings: bookings,
        cachedPublicKey: publicKey,
        lastSyncTime: lastSync,
        pepper: this.config.pepper,
      };

      const decision = await evaluateAccess('rfid', scan.uid, context);
      console.log(`[MESIN KEPUTUSAN] ${decision.action.toUpperCase()} (${decision.code})`);

      const cmdTopic = `${this.config.topicRoot}/cmd`;
      const cmdPayload: MqttCmdMessage = {
        seq: scan.seq,
        action: decision.action,
        name: decision.name,
        reason: decision.reason,
        holdMs: decision.holdMs || 5000,
      };

      this.client?.publish(cmdTopic, JSON.stringify(cmdPayload));

      // Catat ke outbox SQLite lokal
      const eventId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      this.db.enqueueLog({
        eventId,
        roomCode: this.config.roomCode,
        method: 'rfid',
        identifier: scan.uid,
        result: decision.action === 'open' ? 'granted' : 'denied',
        reason: decision.reason || null,
        userName: decision.name || null,
        timestamp,
      });

      if (this.config.onEvent) {
        this.config.onEvent({
          eventId,
          type: 'scan',
          method: 'rfid',
          identifier: scan.uid,
          decision,
          timestamp,
        });
      }
    } catch (err: any) {
      console.error('[MQTT SCAN Error]', err.message);
    }
  }

  /**
   * Buka pintu jarak jauh (remote unlock dari cloud atau manual override)
   */
  public triggerRemoteUnlock(operatorName: string = 'Remote Dosen', holdMs: number = 5000) {
    const cmdTopic = `${this.config.topicRoot}/cmd`;
    const cmdPayload: MqttCmdMessage = {
      seq: 0, // Kontrak: seq 0 diterima firmware saat state IDLE
      action: 'open',
      name: operatorName.substring(0, 16),
      holdMs,
    };

    this.client?.publish(cmdTopic, JSON.stringify(cmdPayload));
    console.log(`[MQTT REMOTE UNLOCK] Perintah buka pintu terkirim ke ${cmdTopic}`);
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      broker: this.config.mqttUrl,
      topicRoot: this.config.topicRoot,
    };
  }

  public disconnect() {
    this.client?.end();
  }
}
