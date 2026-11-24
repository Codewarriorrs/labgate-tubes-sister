'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarPlus,
  DoorOpen,
  QrCode,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  Cpu,
} from 'lucide-react';
import { Room, Booking, Equipment } from '@/types';
import QrModal from '@/components/QrModal';

export default function DashboardPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Booking Baru
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal QR
  const [activeQrBooking, setActiveQrBooking] = useState<Booking | null>(null);

  // Modal Edit
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editPurpose, setEditPurpose] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resRooms, resBookings] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/bookings'),
      ]);
      const jsonRooms = await resRooms.json();
      const jsonBookings = await resBookings.json();

      if (jsonRooms.success) {
        setRooms(jsonRooms.data);
        if (jsonRooms.data.length > 0 && !selectedRoomId) {
          setSelectedRoomId(jsonRooms.data[0].id);
        }
      }
      if (jsonBookings.success) {
        setBookings(jsonBookings.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Buat Booking
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoomId,
          equipmentId: selectedEquipmentId || null,
          purpose,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ type: 'error', message: json.message || 'Gagal mengajukan booking' });
      } else {
        setFeedback({ type: 'success', message: json.message });
        setPurpose('');
        fetchData();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Koneksi terputus ke server cloud' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Batal Booking
  const handleCancelBooking = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan booking ini?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.message);
      }
    } catch {
      alert('Gagal membatalkan booking');
    }
  };

  // Handle Update Booking
  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    try {
      const res = await fetch(`/api/bookings/${editingBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: editPurpose,
          startTime: new Date(editStart).toISOString(),
          endTime: new Date(editEnd).toISOString(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingBooking(null);
        fetchData();
      } else {
        alert(json.message);
      }
    } catch {
      alert('Gagal mengupdate booking');
    }
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const availableEquipment: Equipment[] = (selectedRoom as any)?.equipment || [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Title */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#bae6fd] shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0f766e] bg-[#ddf4ff] px-2.5 py-1 rounded-lg border border-[#bae6fd] inline-block mb-2">
            Portal Mahasiswa
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#3c3c3c] tracking-tight">
            Peminjaman Ruang Laboratorium
          </h1>
          <p className="text-xs text-[#777777] font-medium mt-1">
            Pilih ruangan dan jadwal penggunaan &bull; Tiket QR diterbitkan setelah disetujui dosen/admin
          </p>
        </div>
      </div>

      {/* Grid: Form Booking & Status Ruangan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1-2: Formulir Booking */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 shadow-sm border-2 border-[#bae6fd]">
          <div className="flex items-center space-x-2.5 mb-5 pb-3 border-b-2 border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-[#0f766e] flex items-center justify-center text-white font-bold">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#3c3c3c]">
              Formulir Peminjaman Baru
            </h2>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-xl mb-5 text-xs font-bold flex items-start space-x-2 border-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-red-50 text-red-900 border-red-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleCreateBooking} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#3c3c3c] uppercase tracking-wider mb-1.5">
                  Ruang Laboratorium
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => {
                    setSelectedRoomId(e.target.value);
                    setSelectedEquipmentId('');
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 border-slate-200 bg-white focus:outline-none focus:border-[#0f766e] text-[#3c3c3c]"
                  required
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} ({room.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3c3c3c] uppercase tracking-wider mb-1.5">
                  Alat Lab Tambahan (Opsional)
                </label>
                <select
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border-2 border-slate-200 bg-white focus:outline-none focus:border-[#0f766e] text-[#3c3c3c]"
                >
                  <option value="">(Tidak Meminjam Alat Tambahan)</option>
                  {availableEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#3c3c3c] uppercase tracking-wider mb-1.5">
                  Waktu Mulai
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e] text-[#3c3c3c]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#3c3c3c] uppercase tracking-wider mb-1.5">
                  Waktu Selesai
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e] text-[#3c3c3c]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3c3c3c] uppercase tracking-wider mb-1.5">
                Tujuan / Keperluan Penggunaan
              </label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Contoh: Pengujian simulasi MQTT firmware ESP32 dan verifikasi access gate..."
                rows={3}
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e] text-[#3c3c3c]"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider disabled:opacity-50"
              >
                {submitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Booking'}
              </button>
            </div>
          </form>
        </div>

        {/* Kolom 3: Status Ringkasan Ruangan */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border-2 border-[#bae6fd]">
          <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b-2 border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-[#1cb0f6] flex items-center justify-center text-white font-bold">
              <DoorOpen className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#3c3c3c]">
              Ketersediaan Ruangan
            </h2>
          </div>

          <div className="space-y-3">
            {rooms.map((r) => {
              const isOnline = (r as any).isOnline;
              return (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl border-2 border-slate-100 hover:border-[#bae6fd] hover:bg-[#ddf4ff]/30 transition text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-[#3c3c3c]">{r.code}</span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                        isOnline
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-slate-100 text-[#777777] border border-slate-200'
                      }`}
                    >
                      Gate {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-[#3c3c3c] font-bold mb-1 line-clamp-1">{r.name}</p>
                  <p className="text-[11px] text-[#777777]">Kapasitas: {r.capacity} praktikan</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabel Riwayat Booking Pengguna */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-[#bae6fd] overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-extrabold text-[#3c3c3c]">
            Riwayat Permohonan Peminjaman Anda
          </h2>
          <span className="text-xs text-[#777777] font-bold">
            Total {bookings.length} Peminjaman
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#777777] text-xs font-bold">
            Memuat data booking...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-[#777777] text-xs font-medium">
            Belum ada permohonan booking yang diajukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#3c3c3c]">
              <thead className="bg-[#f0f9ff] text-[10px] font-extrabold text-[#777777] uppercase tracking-wider border-b-2 border-slate-100">
                <tr>
                  <th className="px-5 py-3">ID & Pengguna</th>
                  <th className="px-5 py-3">Ruangan & Alat</th>
                  <th className="px-5 py-3">Jadwal Penggunaan</th>
                  <th className="px-5 py-3">Keperluan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {bookings.map((b) => {
                  const sTime = new Date(b.startTime).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const eTime = new Date(b.endTime).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={b.id} className="hover:bg-[#ddf4ff]/20 transition">
                      <td className="px-5 py-3.5">
                        <span className="font-extrabold text-[#3c3c3c] block">{b.id}</span>
                        <span className="text-[#777777] text-[11px]">{b.userName}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-[#3c3c3c] block">
                          {b.roomName || b.roomId}
                        </span>
                        {b.equipmentName && (
                          <span className="inline-flex items-center text-[10px] font-bold text-[#0f766e] bg-[#ddf4ff] px-2 py-0.5 rounded-md mt-0.5 border border-[#bae6fd]">
                            <Cpu className="w-3 h-3 mr-1" />
                            {b.equipmentName}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-[#3c3c3c] block">{sTime} - {eTime} WIB</span>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs truncate" title={b.purpose}>
                        {b.purpose}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg font-extrabold capitalize text-[10px] uppercase border ${
                            b.status === 'disetujui'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : b.status === 'menunggu'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : b.status === 'ditolak'
                              ? 'bg-red-100 text-red-900 border-red-300'
                              : 'bg-slate-100 text-[#777777] border-slate-200'
                          }`}
                        >
                          {b.status}
                        </span>
                        {b.status === 'ditolak' && b.rejectionReason && (
                          <span className="block text-[10px] text-red-700 mt-0.5 line-clamp-1 font-bold" title={b.rejectionReason}>
                            Alasan: {b.rejectionReason}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        {b.status === 'disetujui' && (
                          <button
                            onClick={() => setActiveQrBooking(b)}
                            className="btn-primary px-3 py-1.5 text-[11px] font-extrabold"
                          >
                            <QrCode className="w-3.5 h-3.5 mr-1" />
                            Tiket QR
                          </button>
                        )}

                        {b.status === 'menunggu' && (
                          <>
                            <button
                              onClick={() => {
                                setEditingBooking(b);
                                setEditPurpose(b.purpose);
                                setEditStart(b.startTime.substring(0, 16));
                                setEditEnd(b.endTime.substring(0, 16));
                              }}
                              className="p-1.5 text-[#777777] hover:text-[#0f766e] hover:bg-[#ddf4ff] rounded-xl transition"
                              title="Ubah Jadwal/Keperluan"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              className="p-1.5 text-[#777777] hover:text-[#ef4444] hover:bg-red-50 rounded-xl transition"
                              title="Batalkan Booking"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tiket QR */}
      <QrModal booking={activeQrBooking} onClose={() => setActiveQrBooking(null)} />

      {/* Modal Edit Permohonan Booking */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border-2 border-[#bae6fd]">
            <h3 className="font-extrabold text-sm sm:text-base text-[#3c3c3c] mb-4 pb-2 border-b-2 border-slate-100">
              Ubah Permohonan Booking ({editingBooking.id})
            </h3>
            <form onSubmit={handleUpdateBooking} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#3c3c3c] mb-1">Waktu Mulai</label>
                <input
                  type="datetime-local"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e]"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#3c3c3c] mb-1">Waktu Selesai</label>
                <input
                  type="datetime-local"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e]"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#3c3c3c] mb-1">Keperluan</label>
                <textarea
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e]"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 text-xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
