'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, RefreshCw, Key, QrCode, CreditCard, Shield, Clock, MapPin, User as UserIcon } from 'lucide-react';
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
      {/* Header: Direct Typography */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
            Log Akses Pintu Laboratorium
          </h1>
          <p className="text-xs text-[#4A4A4A] mt-1">
            Rekam jejak akses fisik pintu realtime dari seluruh edge gateway (Hak Akses Dosen & Admin)
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn-secondary self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-4">
        <div className="flex items-center space-x-2 mb-3 text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-[#0066FF]" />
          <span>Filter Rekam Akses</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#4A4A4A] uppercase mb-1">
              Ruang Laboratorium
            </label>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-[4px] border border-[#D1D5DB] bg-white focus:outline-none focus:border-[#0066FF] text-[#1A1A1A]"
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
            <label className="block text-[11px] font-semibold text-[#4A4A4A] uppercase mb-1">
              Metode Validasi
            </label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-[4px] border border-[#D1D5DB] bg-white focus:outline-none focus:border-[#0066FF] text-[#1A1A1A]"
            >
              <option value="">Semua Metode</option>
              <option value="rfid">KTM RFID</option>
              <option value="qr">Tiket QR</option>
              <option value="manual_pin">PIN Petugas (1722)</option>
              <option value="remote_unlock">Remote Unlock</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#4A4A4A] uppercase mb-1">
              Hasil Akses
            </label>
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-[4px] border border-[#D1D5DB] bg-white focus:outline-none focus:border-[#0066FF] text-[#1A1A1A]"
            >
              <option value="">Semua Hasil</option>
              <option value="granted">Diberikan (Granted)</option>
              <option value="denied">Ditolak (Denied)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Log Akses: Responsive Desktop Table & Mobile Cards */}
      <div className="bg-white border border-[#E5E7EB] rounded-[4px] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
            Catatan Peristiwa Gate Terkini
          </h2>
          <span className="text-xs text-[#4A4A4A]">
            Total {logs.length} Peristiwa
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#4A4A4A] text-xs font-semibold">
            Memuat catatan log...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-[#4A4A4A] text-xs">
            Tidak ada data log yang cocok dengan filter.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1A1A1A]">
                <thead className="bg-[#F8F9FA] text-[11px] font-semibold text-[#4A4A4A] uppercase tracking-wider border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-5 py-2.5">Waktu Peristiwa</th>
                    <th className="px-5 py-2.5">Ruangan</th>
                    <th className="px-5 py-2.5">Metode</th>
                    <th className="px-5 py-2.5">Identitas / Pemilik</th>
                    <th className="px-5 py-2.5">Hasil</th>
                    <th className="px-5 py-2.5">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {logs.map((log) => {
                    const tStr = new Date(log.timestamp).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <tr key={log.id} className="hover:bg-[#F8F9FA] transition">
                        <td className="px-5 py-3 whitespace-nowrap font-mono text-[11px] text-[#4A4A4A]">
                          {tStr}
                        </td>
                        <td className="px-5 py-3 font-semibold">
                          {log.roomName || log.roomId}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {getMethodBadge(log.method)}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-semibold block">{log.userName || 'Anonim'}</span>
                          <span className="font-mono text-[10px] text-[#4A4A4A] truncate block max-w-[140px]" title={log.identifier}>
                            {log.identifier}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {log.result === 'granted' ? (
                            <span className="font-mono text-[10px] font-bold text-[#16A34A] uppercase">
                              [DITERIMA]
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] font-bold text-[#DC2626] uppercase">
                              [DITOLAK]
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[#4A4A4A] max-w-xs truncate" title={log.reason || 'Akses Berhasil'}>
                          {log.reason || 'Akses Berhasil'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Zero Horizontal Scroll) */}
            <div className="md:hidden divide-y divide-[#E5E7EB]">
              {logs.map((log) => {
                const tStr = new Date(log.timestamp).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <div key={log.id} className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm text-[#1A1A1A] block">
                          {log.userName || 'Anonim'}
                        </span>
                        <span className="font-mono text-[10px] text-[#4A4A4A] block">
                          {log.identifier}
                        </span>
                      </div>
                      {log.result === 'granted' ? (
                        <span className="font-mono text-[10px] font-bold text-[#16A34A] uppercase">
                          [DITERIMA]
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] font-bold text-[#DC2626] uppercase">
                          [DITOLAK]
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-[#1A1A1A]">
                      <div className="flex justify-between items-center">
                        <span className="text-[#4A4A4A]">Ruangan:</span>
                        <span className="font-semibold">{log.roomName || log.roomId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#4A4A4A]">Metode:</span>
                        <span>{getMethodBadge(log.method)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#4A4A4A]">Waktu:</span>
                        <span className="font-mono text-[11px] text-[#4A4A4A]">{tStr}</span>
                      </div>
                      <div className="pt-1 border-t border-[#E5E7EB]">
                        <span className="text-[#4A4A4A] text-[11px]">Keterangan:</span>{' '}
                        <span className="font-medium">{log.reason || 'Akses Berhasil'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
