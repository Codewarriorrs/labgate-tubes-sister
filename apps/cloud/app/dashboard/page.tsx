'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarPlus,
  DoorOpen,
  QrCode,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  Cpu,
  Clock,
  MapPin,
} from 'lucide-react';
import { Room, Booking, Equipment } from '@/types';
import QrModal from '@/components/QrModal';

export default function DashboardPage() {
  const router = useRouter();
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

      if (resRooms.status === 401 || resBookings.status === 401) {
        router.push('/login');
        return;
      }

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

  // Handle Edit Booking
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    setSubmitting(true);
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
      alert('Gagal memperbarui permohonan booking');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Hapus/Batal
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

  const currentRoom = rooms.find((r) => r.id === selectedRoomId);
  const availableEquipments: Equipment[] = currentRoom ? (currentRoom as any).equipments || [] : [];

  return (
    <div className="space-y-6">
      {/* Header Halaman: Direct typography, no nested boxes */}
      <div className="border-b border-[#E5E7EB] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
          Peminjaman Ruang Laboratorium
        </h1>
        <p className="text-xs text-[#4A4A4A] mt-1">
          Pilih ruangan dan jadwal penggunaan &bull; Tiket QR diterbitkan setelah disetujui dosen/admin
        </p>
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
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid: Form Booking & Status Ruangan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Form Pengajuan */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-[4px] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E5E7EB] pb-3">
            <CalendarPlus className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
              Formulir Permohonan Akses
            </h2>
          </div>

          <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Pilih Ruang Laboratorium
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => {
                    setSelectedRoomId(e.target.value);
                    setSelectedEquipmentId('');
                  }}
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                  required
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Alat Tambahan (Opsional)
                </label>
                <select
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                >
                  <option value="">-- Tidak meminjam alat khusus --</option>
                  {availableEquipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.code}) &bull; {eq.condition}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Waktu Mulai Akses
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Waktu Selesai Akses
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#1A1A1A] mb-1">
                Keperluan Penggunaan & Riset
              </label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Contoh: Praktikum Pemrograman Jaringan & Pengujian Gateway IoT..."
                rows={3}
                className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full sm:w-auto"
              >
                {submitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Booking'}
              </button>
            </div>
          </form>
        </div>

        {/* Kolom 3: Status Ringkasan Ruangan */}
        <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E5E7EB] pb-3">
            <DoorOpen className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
              Ketersediaan Ruangan
            </h2>
          </div>

          <div className="space-y-2.5">
            {rooms.map((r) => {
              const isOnline = (r as any).isOnline;
              return (
                <div
                  key={r.id}
                  className="p-3 border border-[#E5E7EB] rounded-[4px] hover:border-[#1A1A1A] transition text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#1A1A1A]">{r.code}</span>
                    <span
                      className={`font-mono text-[10px] font-semibold uppercase ${
                        isOnline ? 'text-[#16A34A]' : 'text-[#4A4A4A]'
                      }`}
                    >
                      [{isOnline ? 'Online' : 'Offline'}]
                    </span>
                  </div>
                  <p className="text-[#1A1A1A] font-medium line-clamp-1">{r.name}</p>
                  <p className="text-[11px] text-[#4A4A4A]">Kapasitas: {r.capacity} praktikan</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Riwayat Booking: Responsive Flat Table on Desktop & Flat Cards on Mobile */}
      <div className="bg-white border border-[#E5E7EB] rounded-[4px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
            Riwayat Permohonan Peminjaman Anda
          </h2>
          <span className="text-xs text-[#4A4A4A]">
            Total {bookings.length} Peminjaman
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#4A4A4A] text-xs font-semibold">
            Memuat data booking...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-[#4A4A4A] text-xs">
            Belum ada permohonan booking yang diajukan.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1A1A1A]">
                <thead className="bg-[#F8F9FA] text-[11px] font-semibold text-[#4A4A4A] uppercase tracking-wider border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-5 py-2.5">ID & Pengguna</th>
                    <th className="px-5 py-2.5">Ruangan & Alat</th>
                    <th className="px-5 py-2.5">Jadwal Penggunaan</th>
                    <th className="px-5 py-2.5">Keperluan</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
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
                      <tr key={b.id} className="hover:bg-[#F8F9FA] transition">
                        <td className="px-5 py-3">
                          <span className="font-semibold text-[#1A1A1A] block">{b.id}</span>
                          <span className="text-[#4A4A4A] text-[11px]">{b.userName}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-medium text-[#1A1A1A] block">
                            {b.roomName || b.roomId}
                          </span>
                          {b.equipmentName && (
                            <span className="inline-flex items-center text-[11px] text-[#0066FF] font-medium mt-0.5">
                              <Cpu className="w-3 h-3 mr-1" />
                              {b.equipmentName}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-medium text-[#1A1A1A] block">{sTime} - {eTime} WIB</span>
                        </td>
                        <td className="px-5 py-3 max-w-xs truncate" title={b.purpose}>
                          {b.purpose}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`font-mono text-[11px] uppercase font-bold ${
                              b.status === 'disetujui'
                                ? 'text-[#16A34A]'
                                : b.status === 'menunggu'
                                ? 'text-[#D97706]'
                                : b.status === 'ditolak'
                                ? 'text-[#DC2626]'
                                : 'text-[#4A4A4A]'
                            }`}
                          >
                            [{b.status}]
                          </span>
                          {b.status === 'ditolak' && b.rejectionReason && (
                            <span className="block text-[11px] text-[#DC2626] mt-0.5 truncate max-w-xs" title={b.rejectionReason}>
                              Alasan: {b.rejectionReason}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right space-x-1.5">
                          {b.status === 'disetujui' && (
                            <button
                              onClick={() => setActiveQrBooking(b)}
                              className="btn-accent px-2.5 py-1 text-[11px]"
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
                                className="p-1 text-[#4A4A4A] hover:text-[#1A1A1A] hover:bg-[#E5E7EB] rounded-[2px] transition active:translate-y-[1px]"
                                title="Ubah Jadwal/Keperluan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleCancelBooking(b.id)}
                                className="p-1 text-[#4A4A4A] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-[2px] transition active:translate-y-[1px]"
                                title="Batalkan Booking"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* Mobile Cards View (Zero Horizontal Scroll) */}
            <div className="md:hidden divide-y divide-[#E5E7EB]">
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
                  <div key={b.id} className="p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-sm text-[#1A1A1A] block">
                          {b.roomName || b.roomId}
                        </span>
                        <span className="font-mono text-[10px] text-[#4A4A4A]">{b.id}</span>
                      </div>
                      <span
                        className={`font-mono text-[10px] uppercase font-bold ${
                          b.status === 'disetujui'
                            ? 'text-[#16A34A]'
                            : b.status === 'menunggu'
                            ? 'text-[#D97706]'
                            : b.status === 'ditolak'
                            ? 'text-[#DC2626]'
                            : 'text-[#4A4A4A]'
                        }`}
                      >
                        [{b.status}]
                      </span>
                    </div>

                    <div className="space-y-1 text-[#1A1A1A]">
                      <div className="flex items-center space-x-1.5 text-[#4A4A4A]">
                        <Clock className="w-3.5 h-3.5 text-[#0066FF] shrink-0" />
                        <span>{sTime} - {eTime} WIB</span>
                      </div>
                      {b.equipmentName && (
                        <div className="flex items-center space-x-1.5 text-[#0066FF]">
                          <Cpu className="w-3.5 h-3.5 shrink-0" />
                          <span>Alat: {b.equipmentName}</span>
                        </div>
                      )}
                      <p className="text-[#4A4A4A] pt-0.5">
                        <strong className="text-[#1A1A1A]">Keperluan:</strong> {b.purpose}
                      </p>
                      {b.status === 'ditolak' && b.rejectionReason && (
                        <p className="text-[#DC2626] text-[11px]">
                          <strong>Alasan Tolak:</strong> {b.rejectionReason}
                        </p>
                      )}
                    </div>

                    {/* Actions on Mobile */}
                    <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-end space-x-2">
                      {b.status === 'disetujui' && (
                        <button
                          onClick={() => setActiveQrBooking(b)}
                          className="btn-accent px-3 py-1.5 text-xs flex items-center space-x-1"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Lihat Tiket QR</span>
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
                            className="btn-secondary px-3 py-1.5 text-xs flex items-center space-x-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Ubah</span>
                          </button>
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            className="text-[#DC2626] hover:bg-[#FEE2E2] px-3 py-1.5 rounded-[4px] border border-[#FCA5A5] text-xs flex items-center space-x-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Batal</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal QR Code */}
      {activeQrBooking && (
        <QrModal
          booking={activeQrBooking}
          onClose={() => setActiveQrBooking(null)}
        />
      )}

      {/* Modal Edit Permohonan Booking */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-[#1A1A1A] pb-2 border-b border-[#E5E7EB]">
              Ubah Permohonan Booking ({editingBooking.id})
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">Waktu Mulai Baru</label>
                <input
                  type="datetime-local"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">Waktu Selesai Baru</label>
                <input
                  type="datetime-local"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">Keperluan Penggunaan</label>
                <textarea
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="btn-secondary px-4 py-1.5 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-4 py-1.5 text-xs"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
