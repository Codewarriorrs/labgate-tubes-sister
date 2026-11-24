export interface CloudClientConfig {
  cloudUrl: string;
  apiKey: string;
  roomCode: string;
  version?: string;
}

export class CloudClient {
  private cloudUrl: string;
  private apiKey: string;
  private roomCode: string;
  private version: string;

  constructor(config: CloudClientConfig) {
    this.cloudUrl = config.cloudUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.roomCode = config.roomCode;
    this.version = config.version || '1.0.0';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /**
   * 1. GET /api/gateway/snapshot
   * Mengambil snapshot booking aktif & public key offline
   */
  public async fetchSnapshot(since?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const url = since
        ? `${this.cloudUrl}/api/gateway/snapshot?since=${encodeURIComponent(since)}`
        : `${this.cloudUrl}/api/gateway/snapshot`;

      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.message || `HTTP ${res.status}` };
      }
      return { success: true, data: json.data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal koneksi ke cloud server' };
    }
  }

  /**
   * 2. POST /api/gateway/logs
   * Mengirim log akses outbox ke cloud secara berkelompok (idempoten)
   */
  public async sendLogs(logs: any[]): Promise<{ success: boolean; acceptedIds?: string[]; error?: string }> {
    if (logs.length === 0) return { success: true, acceptedIds: [] };

    try {
      const res = await fetch(`${this.cloudUrl}/api/gateway/logs`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ logs }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.message || `HTTP ${res.status}` };
      }
      return { success: true, acceptedIds: json.data?.acceptedEventIds || [] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 3. PUT /api/gateway/heartbeat
   * Mengirim heartbeat status online & statistik antrean
   */
  public async sendHeartbeat(queueCount: number, lastSync?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.cloudUrl}/api/gateway/heartbeat`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          roomCode: this.roomCode,
          version: this.version,
          queueCount,
          lastSync,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 4. GET /api/gateway/commands
   * Mengambil antrean perintah admin aktif (mis. remote_unlock)
   */
  public async fetchCommands(): Promise<{ success: boolean; commands?: any[]; error?: string }> {
    try {
      const res = await fetch(`${this.cloudUrl}/api/gateway/commands`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.message };
      }
      return { success: true, commands: json.data?.commands || [] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 5. DELETE /api/gateway/commands/{id}
   * Konfirmasi eksekusi perintah sehingga dihapus dari antrean server
   */
  public async acknowledgeCommand(commandId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.cloudUrl}/api/gateway/commands/${commandId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
