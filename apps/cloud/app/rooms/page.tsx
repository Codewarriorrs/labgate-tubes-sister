'use client';

import React, { useState, useEffect } from 'react';
import { DoorClosed, Plus, Trash2, Unlock, AlertCircle, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { Room } from '@/types';

export default function RoomsPage() {
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
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rooms');
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
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, capacity, description, apiKey }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setName('');
        setCode('');
        setDescription('');
        setApiKey('');
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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#bae6fd] shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0f766e] bg-[#ddf4ff] px-2.5 py-1 rounded-lg border border-[#bae6fd] inline-block mb-2">
            Administrasi Laboratorium
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#3c3c3c] tracking-tight">
            Manajemen Ruangan & Perangkat Gateway
          </h1>
          <p className="text-xs text-[#777777] font-medium mt-1">
            Konfigurasi ruangan, kunci API gateway, status online gate, dan buka pintu jarak jauh
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider self-start md:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Tambah Ruangan
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-start space-x-2.5 border-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid Ruangan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-[#777777] text-xs font-bold">
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
              className="bg-white rounded-2xl p-5 shadow-sm border-2 border-[#bae6fd] flex flex-col justify-between hover:border-teal-400 transition"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-extrabold text-[#3c3c3c] text-base block">
                      {room.name}
                    </span>
                    <span className="text-[11px] font-extrabold text-[#0f766e] bg-[#ddf4ff] px-2 py-0.5 rounded-lg border border-[#bae6fd] inline-block mt-1">
                      Kode: {room.code}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${
                      isOnline
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-slate-100 text-[#777777] border-slate-200'
                    }`}
                  >
                    {isOnline ? (
                      <>
                        <Wifi className="w-3 h-3 mr-1 text-emerald-600" />
                        Online
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 mr-1 text-slate-400" />
                        Offline
                      </>
                    )}
                  </span>
                </div>

                <p className="text-xs text-[#777777] leading-relaxed">
                  {room.description || 'Tidak ada deskripsi'}
                </p>

                <div className="bg-[#f8fafc] rounded-xl p-3 text-[11px] text-[#3c3c3c] space-y-1.5 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-[#777777]">Detak Terakhir:</span>
                    <span className="font-bold">{lastSeenStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#777777]">Sinkron Terakhir:</span>
                    <span className="font-bold">{lastSyncStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#777777]">Antrean Log:</span>
                    <span className="font-extrabold text-[#0f766e]">{room.queueCount || 0} event</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t-2 border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleRemoteUnlock(room.id, room.name)}
                  disabled={unlockLoadingId === room.id}
                  className="btn-primary py-2 px-3 text-xs font-extrabold flex items-center space-x-1.5 disabled:opacity-50"
                  title="Kirim perintah buka relay solenoid ke gateway"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{unlockLoadingId === room.id ? 'Mengirim...' : 'Buka Pintu Jarak Jauh'}</span>
                </button>

                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  className="p-2 text-[#777777] hover:text-[#ef4444] hover:bg-red-50 rounded-xl transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border-2 border-[#bae6fd]">
            <h3 className="font-extrabold text-sm sm:text-base text-[#3c3c3c] mb-4 pb-2 border-b-2 border-slate-100">
              Tambah Ruangan Laboratorium Baru
            </h3>
            <form onSubmit={handleAddRoom} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#3c3c3c] mb-1">Nama Laboratorium</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Laboratorium Komputasi Awan"
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#3c3c3c] mb-1">Kode Ruangan</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="lab-04"
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#3c3c3c] mb-1">Kapasitas</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#3c3c3c] mb-1">API Key Gateway (Disimpan sebagai Hash SHA-256)</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="gw_lab04_secret_key_semarang_2026"
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#3c3c3c] mb-1">Deskripsi & Lokasi</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Gedung D Lantai 3 Fakultas Teknik Undip Tembalang"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-4 py-2 text-xs"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Ruangan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
