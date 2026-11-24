'use client';

import React, { useState, useEffect } from 'react';
import { History, Filter, CheckCircle2, XCircle, RefreshCw, Key, QrCode, CreditCard, Shield } from 'lucide-react';
import { AccessLog, Room } from '@/types';

export default function LogsPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterRoom, setFilterRoom] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterResult, setFilterResult] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterRoom) params.set('roomId', filterRoom);
      if (filterMethod) params.set('method', filterMethod);
      if (filterResult) params.set('result', filterResult);

      const [resLogs, resRooms] = await Promise.all([
        fetch(`/api/access-logs?${params.toString()}`),
        fetch('/api/rooms'),
      ]);

      const jsonLogs = await resLogs.json();
      const jsonRooms = await resRooms.json();

      if (jsonLogs.success) setLogs(jsonLogs.data);
      if (jsonRooms.success) setRooms(jsonRooms.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterRoom, filterMethod, filterResult]);

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'rfid':
        return (
          <span className="inline-flex items-center text-[10px] font-extrabold text-[#0f766e] bg-[#ddf4ff] px-2 py-0.5 rounded-lg border border-[#bae6fd]">
            <CreditCard className="w-3 h-3 mr-1" />
            KTM RFID
          </span>
        );
      case 'qr':
        return (
          <span className="inline-flex items-center text-[10px] font-extrabold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-lg border border-teal-300">
            <QrCode className="w-3 h-3 mr-1" />
            Tiket QR
          </span>
        );
      case 'manual_pin':
        return (
          <span className="inline-flex items-center text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
            <Key className="w-3 h-3 mr-1" />
            PIN Petugas (1722)
          </span>
        );
      case 'remote_unlock':
        return (
          <span className="inline-flex items-center text-[10px] font-extrabold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300">
            <Shield className="w-3 h-3 mr-1" />
            Remote Unlock
          </span>
        );
      default:
        return <span>{method}</span>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#bae6fd] shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0f766e] bg-[#ddf4ff] px-2.5 py-1 rounded-lg border border-[#bae6fd] inline-block mb-2">
            Audit Keamanan
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#3c3c3c] tracking-tight">
            Log Audit & Riwayat Akses Pintu Laboratorium
          </h1>
          <p className="text-xs text-[#777777] font-medium mt-1">
            Rekam jejak setiap pemindaian KTM RFID, tiket QR, pembukaan darurat PIN, dan remote unlock
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="btn-secondary px-3.5 py-2 text-xs font-bold self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Segarkan Data
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#bae6fd] shadow-sm">
        <div className="flex items-center space-x-2 mb-3 pb-2 border-b-2 border-slate-100">
          <Filter className="w-4 h-4 text-[#0f766e]" />
          <span className="text-xs font-extrabold text-[#3c3c3c] uppercase tracking-wider">
            Filter Log Akses
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#777777] uppercase mb-1">
              Ruang Laboratorium
            </label>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-slate-200 bg-white focus:outline-none focus:border-[#0f766e] text-[#3c3c3c]"
            >
              <option value="">Semua Ruangan</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#777777] uppercase mb-1">
              Metode Validasi
            </label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-slate-200 bg-white focus:outline-none focus:border-[#0f766e] text-[#3c3c3c]"
            >
              <option value="">Semua Metode</option>
              <option value="rfid">KTM RFID</option>
              <option value="qr">Tiket QR</option>
              <option value="manual_pin">PIN Petugas (1722)</option>
              <option value="remote_unlock">Remote Unlock</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#777777] uppercase mb-1">
              Hasil Akses
            </label>
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border-2 border-slate-200 bg-white focus:outline-none focus:border-[#0f766e] text-[#3c3c3c]"
            >
              <option value="">Semua Hasil</option>
              <option value="granted">Diberikan (Granted)</option>
              <option value="denied">Ditolak (Denied)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Log Akses */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-[#bae6fd] overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-extrabold text-[#3c3c3c]">
            Catatan Peristiwa Gate Terkini
          </h2>
          <span className="text-xs text-[#777777] font-bold">
            Total {logs.length} Peristiwa Terdaftar
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#777777] text-xs font-bold">
            Memuat catatan log...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-[#777777] text-xs font-medium">
            Tidak ada data log yang cocok dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#3c3c3c]">
              <thead className="bg-[#f0f9ff] text-[10px] font-extrabold text-[#777777] uppercase tracking-wider border-b-2 border-slate-100">
                <tr>
                  <th className="px-5 py-3">Waktu Peristiwa</th>
                  <th className="px-5 py-3">Ruangan</th>
                  <th className="px-5 py-3">Metode</th>
                  <th className="px-5 py-3">Identitas / Pemilik</th>
                  <th className="px-5 py-3">Hasil</th>
                  <th className="px-5 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.map((log) => {
                  const tStr = new Date(log.timestamp).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-[#ddf4ff]/20 transition">
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-[11px] text-[#777777]">
                        {tStr}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#3c3c3c]">
                        {log.roomName || log.roomId}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getMethodBadge(log.method)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-[#3c3c3c] block">
                          {log.userName || 'Anonim'}
                        </span>
                        <span className="font-mono text-[10px] text-[#777777] truncate block max-w-[140px]" title={log.identifier}>
                          {log.identifier}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {log.result === 'granted' ? (
                          <span className="inline-flex items-center text-[10px] font-extrabold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300 uppercase">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Diterima
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-extrabold text-red-900 bg-red-100 px-2 py-0.5 rounded-lg border border-red-300 uppercase">
                            <XCircle className="w-3 h-3 mr-1 text-red-600" />
                            Ditolak
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[#777777] max-w-xs truncate" title={log.reason || 'Akses Berhasil'}>
                        {log.reason || 'Akses Disetujui'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
