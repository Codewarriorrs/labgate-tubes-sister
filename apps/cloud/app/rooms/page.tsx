'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Unlock, AlertCircle, CheckCircle2, Wifi, WifiOff } from 'lucide-react';
import { Room } from '@/types';

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
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rooms');
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
    <div className="space-y-6">
      {/* Header: Direct Typography, no nested boxes, no pill badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
            Manajemen Ruangan & Perangkat Gateway
          </h1>
          <p className="text-xs text-[#4A4A4A] mt-1">
            Konfigurasi ruangan, kunci API gateway, status online gate, dan buka pintu jarak jauh (Hak Akses Kepala TU / Admin)
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Tambah Ruangan
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-[4px] text-xs font-semibold flex items-start space-x-2 border ${
            feedback.type === 'success'
              ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
              : 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid Ruangan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-[#4A4A4A] text-xs font-semibold">
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
              className="bg-white rounded-[4px] p-5 border border-[#E5E7EB] flex flex-col justify-between hover:border-[#1A1A1A] transition"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-[#1A1A1A] text-base block">
                      {room.name}
                    </span>
                    <span className="font-mono text-xs text-[#0066FF] font-semibold mt-0.5 block">
                      Kode: {room.code}
                    </span>
                  </div>

                  <span
                    className={`font-mono text-[10px] font-bold uppercase ${
                      isOnline ? 'text-[#16A34A]' : 'text-[#4A4A4A]'
                    }`}
                  >
                    [{isOnline ? 'ONLINE' : 'OFFLINE'}]
                  </span>
                </div>

                <p className="text-xs text-[#4A4A4A] leading-relaxed">
                  {room.description || 'Tidak ada deskripsi'}
                </p>

                <div className="bg-[#F8F9FA] rounded-[2px] p-3 text-[11px] text-[#1A1A1A] space-y-1.5 border border-[#E5E7EB]">
                  <div className="flex justify-between">
                    <span className="text-[#4A4A4A]">Detak Terakhir:</span>
                    <span className="font-mono">{lastSeenStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4A4A4A]">Sinkron Terakhir:</span>
                    <span className="font-mono">{lastSyncStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4A4A4A]">Antrean Log:</span>
                    <span className="font-semibold text-[#0066FF]">{room.queueCount || 0} event</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#E5E7EB] flex items-center justify-between">
                <button
                  onClick={() => handleRemoteUnlock(room.id, room.name)}
                  disabled={unlockLoadingId === room.id}
                  className="btn-primary py-1.5 px-3 text-xs flex items-center space-x-1.5 disabled:opacity-50"
                  title="Kirim perintah buka relay solenoid ke gateway"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{unlockLoadingId === room.id ? 'Mengirim...' : 'Buka Pintu Jarak Jauh'}</span>
                </button>

                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  className="p-1.5 text-[#4A4A4A] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-[2px] transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-[#1A1A1A] pb-2 border-b border-[#E5E7EB]">
              Tambah Ruangan Laboratorium Baru
            </h3>
            <form onSubmit={handleAddRoom} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">Nama Laboratorium</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Laboratorium Komputasi Awan"
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">Kode Ruangan</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="lab-04"
                    className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">Kapasitas</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">API Key Gateway (Disimpan sebagai Hash SHA-256)</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="gw_lab04_secret_key_semarang_2026"
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">Deskripsi & Lokasi</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Gedung D Lantai 3 Fakultas Teknik Undip Tembalang"
                  rows={2}
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary px-4 py-1.5 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-4 py-1.5 text-xs"
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
