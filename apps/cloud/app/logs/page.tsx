'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, RefreshCw, Key, QrCode, CreditCard, Shield, Clock, MapPin, AlertCircle, User as UserIcon } from 'lucide-react';
import { AccessLog, Room } from '@/types';

export default function LogsPage() {
  const router = useRouter();
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

      if (resLogs.status === 401 || resRooms.status === 401) {
        router.push('/login');
        return;
      }

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
          <span className="inline-flex items-center text-[11px] font-semibold text-[#1A1A1A]">
            <CreditCard className="w-3.5 h-3.5 mr-1 text-[#0066FF]" />
            KTM RFID
          </span>
        );
      case 'qr':
        return (
          <span className="inline-flex items-center text-[11px] font-semibold text-[#1A1A1A]">
            <QrCode className="w-3.5 h-3.5 mr-1 text-[#0066FF]" />
            Tiket QR
          </span>
        );
      case 'manual_pin':
        return (
          <span className="inline-flex items-center text-[11px] font-semibold text-[#1A1A1A]">
            <Key className="w-3.5 h-3.5 mr-1 text-[#D97706]" />
            PIN Petugas (1722)
          </span>
        );
      case 'remote_unlock':
        return (
          <span className="inline-flex items-center text-[11px] font-semibold text-[#1A1A1A]">
            <Shield className="w-3.5 h-3.5 mr-1 text-[#16A34A]" />
            Remote Unlock
          </span>
        );
      default:
        return <span>{method}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Log Akses Pintu Laboratorium
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Rekam jejak otentikasi fisik gate secara realtime dari seluruh edge gateway
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn-pill-secondary self-start sm:self-auto px-5 py-2.5 text-xs font-semibold flex items-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center space-x-2.5 mb-4 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2A85FF] flex items-center justify-center">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <span>Filter Rekam Akses</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Ruang Laboratorium
            </label>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 text-slate-900 transition"
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
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Metode Validasi
            </label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 text-slate-900 transition"
            >
              <option value="">Semua Metode</option>
              <option value="rfid">KTM RFID</option>
              <option value="qr">Tiket QR</option>
              <option value="manual_pin">PIN Petugas (1722)</option>
              <option value="remote_unlock">Remote Unlock</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Hasil Akses
            </label>
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 text-slate-900 transition"
            >
              <option value="">Semua Hasil</option>
              <option value="granted">Diberikan (Granted)</option>
              <option value="denied">Ditolak (Denied)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Log Akses: Responsive Cards */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Catatan Peristiwa Gate Terkini
            </h2>
            <p className="text-xs text-slate-400">Log sinkronisasi offline-first dan pembukaan solenoid</p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
            Total {logs.length} Peristiwa
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Memuat catatan log...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Tidak ada data log yang cocok dengan filter.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const tStr = new Date(log.timestamp).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-center shrink-0 shadow-xs ${
                        log.result === 'granted'
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                          : 'bg-rose-500 text-white shadow-rose-500/20'
                      }`}
                    >
                      {log.result === 'granted' ? (
                        <Shield className="w-6 h-6" />
                      ) : (
                        <AlertCircle className="w-6 h-6" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{log.roomName || log.roomId}</span>
                        <span>&bull;</span>
                        <span className="font-mono text-slate-400">{tStr}</span>
                      </div>

                      <div className="flex items-center space-x-2 text-slate-900">
                        <span className="font-bold text-sm">{log.userName || 'Pengguna Tidak Dikenal'}</span>
                        <span className="font-mono text-xs text-slate-400">({log.identifier})</span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-600">
                        <span>Metode:</span>
                        {getMethodBadge(log.method)}
                        <span>&bull;</span>
                        <span className="text-slate-500">{log.reason || 'Akses Berhasil'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {log.result === 'granted' ? (
                      <span className="inline-flex items-center bg-emerald-600 text-white font-semibold px-2.5 py-0.5 rounded-md text-xs">
                        Akses Diterima
                      </span>
                    ) : (
                      <span className="inline-flex items-center bg-rose-600 text-white font-semibold px-2.5 py-0.5 rounded-md text-xs">
                        Akses Ditolak
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
