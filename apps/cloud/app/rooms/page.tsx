'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Unlock, AlertCircle, CheckCircle2, QrCode, X } from 'lucide-react';
import { Room } from '@/types';
import { invalidateCache } from '@/lib/clientCache';

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockLoadingId, setUnlockLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Tambah Ruangan
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState(30);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal Scan / Verifikasi QR Langsung di Cloud
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrRoomCode, setQrRoomCode] = useState('lab-01');
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [qrVerifying, setQrVerifying] = useState(false);
  const [qrResult, setQrResult] = useState<{ action: string; name?: string; reason?: string } | null>(null);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rooms', { cache: 'no-store' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setRooms(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleRemoteUnlock = async (roomId: string, roomName: string) => {
    setUnlockLoadingId(roomId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/remote-unlock`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', message: json.message });
      } else {
        setFeedback({ type: 'error', message: json.message });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Gagal mengirim perintah buka pintu jarak jauh' });
    } finally {
      setUnlockLoadingId(null);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm(`Hapus ruangan ${roomId}? Perangkat gate untuk ruangan ini tidak akan dapat sinkron.`)) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        invalidateCache('rooms');
        fetchRooms();
      } else {
        alert(json.message);
      }
    } catch {
      alert('Gagal menghapus ruangan');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      // Generate kunci perangkat secara otomatis (tidak perlu diisi manual oleh admin)
      const slug = code.toLowerCase().replace(/[^a-z0-9]/g, '') || 'lab';
      const autoApiKey = `gw_${slug}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, capacity, description, apiKey: autoApiKey }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setName('');
        setCode('');
        setDescription('');
        invalidateCache('rooms');
        fetchRooms();
        setFeedback({ type: 'success', message: json.message });
      } else {
        setFeedback({ type: 'error', message: json.message });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menambahkan ruangan' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyQr = async (e: React.FormEvent) => {
    e.preventDefault();
    setQrVerifying(true);
    setQrResult(null);
    try {
      const res = await fetch('/api/gate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: qrRoomCode,
          method: 'qr',
          token: qrTokenInput.trim(),
        }),
      });
      const json = await res.json();
      setQrResult(json);
    } catch {
      setQrResult({ action: 'deny', reason: 'Gagal terhubung ke server' });
    } finally {
      setQrVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Manajemen Ruangan & Perangkat Gateway
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Konfigurasi ruangan, kunci API gateway, status gate fisik, dan kendali buka jarak jauh
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              setQrResult(null);
              setQrTokenInput('');
              setShowQrModal(true);
            }}
            className="btn-pill-secondary px-5 py-2.5 text-xs font-semibold flex items-center"
          >
            <QrCode className="w-4 h-4 mr-1.5" />
            Verifikasi Tiket QR
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-pill-primary px-6 py-2.5 text-xs font-semibold flex items-center shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Ruangan
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-sm font-medium flex items-start space-x-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid Ruangan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-100">
            Memuat data ruangan...
          </div>
        ) : rooms.map((room) => {
          const isOnline = (room as any).isOnline;
          const lastSeenStr = room.lastSeen
            ? new Date(room.lastSeen).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : 'Belum pernah';
          const lastSyncStr = room.lastSync
            ? new Date(room.lastSync).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : 'Belum pernah';

          return (
            <div
              key={room.id}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-lg transition flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {room.name}
                    </h3>
                    <span className="font-mono text-xs text-[#2A85FF] font-semibold mt-0.5 block">
                      Kode: {room.code}
                    </span>
                  </div>

                  {isOnline ? (
                    <span className="inline-flex items-center bg-emerald-600 text-white font-semibold px-2.5 py-0.5 rounded-md text-xs">
                      <span className="w-2 h-2 rounded-full bg-white mr-1.5 animate-pulse" />
                      Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center bg-slate-200 text-slate-700 font-semibold px-2.5 py-0.5 rounded-md text-xs">
                      <span className="w-2 h-2 rounded-full bg-slate-500 mr-1.5" />
                      Offline
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {room.description || 'Tidak ada deskripsi'}
                </p>

                {/* Status Box: DentCare Soft Sky-Blue Tint */}
                <div className="bg-[#EAF4FF] rounded-2xl p-4 text-xs text-slate-700 space-y-2 border border-blue-100/60">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Kapasitas:</span>
                    <span className="font-semibold text-slate-900">{room.capacity || 30} Praktikan</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Detak Gateway:</span>
                    <span className="font-mono text-slate-800">{lastSeenStr}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Sinkron Terakhir:</span>
                    <span className="font-mono text-slate-800">{lastSyncStr}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Antrean Log:</span>
                    <span className="font-semibold text-[#2A85FF]">{room.queueCount || 0} event</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleRemoteUnlock(room.id, room.name)}
                  disabled={unlockLoadingId === room.id}
                  className="flex-1 btn-pill-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
                  title="Kirim sinyal unlock ke gate ESP32 via MQTT"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{unlockLoadingId === room.id ? 'Mengirim...' : 'Buka Pintu Jarak Jauh'}</span>
                </button>

                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  className="btn-pill-danger p-2.5 text-xs font-semibold"
                  title="Hapus Ruangan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Tambah Ruangan */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                Tambah Ruangan Laboratorium Baru
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Daftarkan gate baru untuk sinkronisasi offline-first</p>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1.5 text-xs">Nama Laboratorium</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Laboratorium Komputasi Awan"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 bg-white text-slate-900 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5 text-xs">Kode Ruangan</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="lab-04"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 bg-white text-slate-900 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5 text-xs">Kapasitas</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 30)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 bg-white text-slate-900 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5 text-xs">Deskripsi & Lokasi</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Gedung D Lantai 3 Fakultas Teknik Undip Tembalang"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 bg-white text-slate-900 transition"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-pill-secondary px-5 py-2 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-pill-primary px-6 py-2 text-xs font-semibold shadow-sm"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Ruangan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Verifikasi / Scan Tiket QR Langsung di Cloud */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Verifikasi Tiket QR
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tempel token QR tiket mahasiswa untuk validasi akses ruangan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyQr} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1.5 text-xs">Ruangan Tujuan</label>
                <select
                  value={qrRoomCode}
                  onChange={(e) => setQrRoomCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-900 focus:outline-none focus:border-[#2A85FF]"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5 text-xs">Token Tiket QR</label>
                <textarea
                  value={qrTokenInput}
                  onChange={(e) => setQrTokenInput(e.target.value)}
                  placeholder="eyJhbGciOiJFZERTQSJ9..."
                  rows={3}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-white text-slate-900 focus:outline-none focus:border-[#2A85FF]"
                />
              </div>

              {qrResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                    qrResult.action === 'open'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {qrResult.action === 'open' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>AKSES DITERIMA: {qrResult.name}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>AKSES DITOLAK: {qrResult.reason}</span>
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="btn-pill-secondary px-5 py-2 text-xs font-semibold"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={qrVerifying}
                  className="btn-pill-primary px-6 py-2 text-xs font-semibold shadow-sm"
                >
                  {qrVerifying ? 'Memverifikasi...' : 'Validasi QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
