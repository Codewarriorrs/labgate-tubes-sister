'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarPlus,
  DoorOpen,
  QrCode,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  Calendar,
  Info,
} from 'lucide-react';
import { Room, Booking, Equipment } from '@/types';
import { getCachedData, setCachedData, invalidateCache } from '@/lib/clientCache';

// Lazy loading modal QR Code
const QrModal = React.lazy(() => import('@/components/QrModal'));

export default function DashboardPage() {
  const router = useRouter();

  // In-memory cache initialization to avoid flickering / blank state on return
  const cachedRooms = getCachedData<Room[]>('rooms');
  const cachedBookings = getCachedData<Booking[]>('my_bookings');

  const [rooms, setRooms] = useState<Room[]>(cachedRooms || []);
  const [bookings, setBookings] = useState<Booking[]>(cachedBookings || []);
  const [allRoomSchedules, setAllRoomSchedules] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(!cachedRooms);

  // Form Booking Baru
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [purpose, setPurpose] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Accordion state untuk Riwayat Permohonan
  const [historyAccordionOpen, setHistoryAccordionOpen] = useState(true);

  // Modal QR & Edit
  const [activeQrBooking, setActiveQrBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editPurpose, setEditPurpose] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  // Minimum datetime string untuk mencegah tanggal & jam di masa lalu (YYYY-MM-DDTHH:mm)
  const minDateTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  // Fetch data dengan caching
  const fetchData = async (force: boolean = false) => {
    try {
      if (force || !cachedRooms) {
        setLoading(true);
      }
      const [resRooms, resBookings, resSchedules] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/bookings'),
        fetch('/api/bookings?scheduleOnly=true'),
      ]);

      if (resRooms.status === 401 || resBookings.status === 401) {
        router.push('/login');
        return;
      }

      const jsonRooms = await resRooms.json();
      const jsonBookings = await resBookings.json();
      const jsonSchedules = await resSchedules.json();

      if (jsonRooms.success) {
        setRooms(jsonRooms.data);
        setCachedData('rooms', jsonRooms.data, 60);
        if (jsonRooms.data.length > 0 && !selectedRoomId) {
          setSelectedRoomId(jsonRooms.data[0].id);
        }
      }
      if (jsonBookings.success) {
        setBookings(jsonBookings.data);
        setCachedData('my_bookings', jsonBookings.data, 60);
      }
      if (jsonSchedules.success) {
        setAllRoomSchedules(jsonSchedules.data);
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

  // Filter jam terisi untuk ruangan yang sedang dipilih
  const occupiedSlotsForSelectedRoom = useMemo(() => {
    if (!selectedRoomId) return [];
    return allRoomSchedules.filter((b) => b.roomId === selectedRoomId);
  }, [allRoomSchedules, selectedRoomId]);

  // Handle Multi-select Chips Alat
  const toggleEquipmentChip = (eqId: string) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(eqId) ? prev.filter((id) => id !== eqId) : [...prev, eqId]
    );
  };

  // Handle Buat Booking dengan Validasi Jam Kerja & Masa Lalu
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const now = new Date();

    // 1. Validasi Masa Lalu
    if (startDate < now) {
      setFeedback({
        type: 'error',
        message: 'Waktu mulai peminjaman tidak boleh berada di masa lalu.',
      });
      return;
    }
    if (endDate <= startDate) {
      setFeedback({
        type: 'error',
        message: 'Waktu selesai harus lebih besar daripada waktu mulai.',
      });
      return;
    }

    // 2. Validasi Jam Kerja (06.00 - 19.00 WIB) dinonaktifkan sementara untuk pengetesan 24 jam

    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoomId,
          equipmentId: selectedEquipmentIds.length > 0 ? selectedEquipmentIds : null,
          purpose,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ type: 'error', message: json.message || 'Gagal mengajukan booking' });
      } else {
        setFeedback({ type: 'success', message: json.message });
        setPurpose('');
        setSelectedEquipmentIds([]);
        invalidateCache('my_bookings');
        fetchData(true);
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
        invalidateCache('my_bookings');
        fetchData(true);
      } else {
        alert(json.message);
      }
    } catch {
      alert('Gagal memperbarui permohonan booking');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Batal Booking
  const handleCancelBooking = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan permohonan booking ini?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        invalidateCache('my_bookings');
        fetchData(true);
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
      {/* Header Halaman: Bersih & Proporsional */}
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Peminjaman Ruang Laboratorium
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pilih ruangan dan jadwal penggunaan &bull; Jam operasional kerja 06.00 – 19.00 WIB
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-sm font-medium flex items-start space-x-2.5 border ${
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

      {/* Section Atas (2-Column Grid: 65% Form Pengajuan, 35% Ketersediaan Ruangan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Card Kiri (Formulir Peminjaman Baru) - DentCare Rounded-3xl Card */}
        <div className="lg:col-span-8 bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2A85FF] flex items-center justify-center">
              <CalendarPlus className="w-5 h-5 text-[#2A85FF]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Formulir Peminjaman Baru
              </h2>
              <p className="text-xs text-slate-500">
                Lengkapi formulir untuk mengajukan izin pemakaian laboratorium.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateBooking} className="space-y-5">
            {/* Dropdown Ruang Laboratorium */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Ruang Laboratorium
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => {
                  setSelectedRoomId(e.target.value);
                  setSelectedEquipmentIds([]);
                }}
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2A85FF] bg-white text-slate-900 transition"
                required
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code}) &bull; Kapasitas: {r.capacity} praktikan
                  </option>
                ))}
              </select>
            </div>

            {/* Banner Informasi Slot Jam Terisi pada Ruangan Terpilih */}
            <div className="p-4 bg-[#F8FAFC] border border-slate-200/70 rounded-2xl text-xs space-y-2">
              <div className="flex items-center space-x-2 text-slate-800 font-bold">
                <Clock className="w-4 h-4 text-[#2A85FF]" />
                <span>Jadwal Terisi pada {currentRoom?.name || 'Ruangan'}:</span>
              </div>
              {occupiedSlotsForSelectedRoom.length === 0 ? (
                <p className="text-emerald-700 font-medium pl-6">
                  Belum ada peminjaman aktif &bull; Semua slot jam 06.00 – 19.00 WIB tersedia.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1 pl-6">
                  {occupiedSlotsForSelectedRoom.map((slot) => {
                    const s = new Date(slot.startTime).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const e = new Date(slot.endTime).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const day = new Date(slot.startTime).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    });
                    return (
                      <span
                        key={slot.id}
                        className="bg-white border border-slate-200 text-slate-800 font-semibold text-xs px-2.5 py-1 rounded-md shadow-2xs"
                      >
                        {day}: {s} - {e} WIB ({slot.userName ? slot.userName.split(' ')[0] : 'Peminjam'})
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Input Waktu Mulai & Selesai (Restriksi Masa Lalu & Jam Kerja) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Waktu Mulai Akses
                </label>
                <input
                  type="datetime-local"
                  min={minDateTime}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2A85FF] bg-white text-slate-900 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Waktu Selesai Akses
                </label>
                <input
                  type="datetime-local"
                  min={startTime || minDateTime}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2A85FF] bg-white text-slate-900 transition"
                  required
                />
              </div>
            </div>

            {/* Multi-Select Chips/Tags untuk Alat Lab Tambahan */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Alat Lab Tambahan (Multi-Select)
              </label>
              {availableEquipments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Tidak ada alat khusus yang didaftarkan pada ruangan ini.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {availableEquipments.map((eq) => {
                    const isSelected = selectedEquipmentIds.includes(eq.id);
                    return (
                      <button
                        type="button"
                        key={eq.id}
                        onClick={() => toggleEquipmentChip(eq.id)}
                        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          isSelected
                            ? 'bg-[#2A85FF] border-[#2A85FF] text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Cpu className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <span>{eq.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Keperluan Penggunaan */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Keperluan Penggunaan & Riset
              </label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Jelaskan tujuan peminjaman laboratorium, praktikum, atau penelitian..."
                rows={3}
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#2A85FF] bg-white text-slate-900 transition"
                required
              />
            </div>

            {/* Tombol Utama: DentCare Solid Obsidian Black Pill Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-pill-primary w-full sm:w-auto px-8 py-3 text-sm"
              >
                {submitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Booking'}
              </button>
            </div>
          </form>
        </div>

        {/* Card Kanan (Ketersediaan Ruangan) - DentCare Style */}
        <div className="lg:col-span-4 bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] rounded-3xl p-6 space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <DoorOpen className="w-4 h-4 text-slate-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ketersediaan Ruangan
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Klik kartu ruangan di bawah untuk memilihnya langsung pada formulir:
          </p>

          <div className="space-y-3">
            {rooms.map((r) => {
              const isOnline = (r as any).isOnline;
              const isSelected = selectedRoomId === r.id;

              return (
                <div
                  key={r.id}
                  onClick={() => {
                    setSelectedRoomId(r.id);
                    setSelectedEquipmentIds([]);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#2A85FF] ring-2 ring-blue-100 bg-blue-50/20 shadow-xs'
                      : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-sm text-slate-900">{r.code}</span>
                    {/* Status Badge with Dot Indicator */}
                    {isOnline ? (
                      <span className="inline-flex items-center space-x-1.5 bg-emerald-600 text-white px-2.5 py-0.5 rounded-md text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        <span>Tersedia</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                        <span>Offline</span>
                      </span>
                    )}
                  </div>

                  {/* Nama Lengkap Ruangan */}
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">
                    {r.name}
                  </h3>

                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                    <span>Kapasitas: {r.capacity} praktikan</span>
                    {isSelected && (
                      <span className="text-[#2A85FF] font-bold text-xs">Terpilih</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section Bawah: Riwayat Permohonan Peminjaman (DentCare Booking Cards) */}
      <div className="bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] rounded-3xl overflow-hidden">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setHistoryAccordionOpen(!historyAccordionOpen)}
          className="w-full px-6 sm:px-8 py-5 flex items-center justify-between bg-white hover:bg-slate-50/80 transition text-left"
        >
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-bold text-slate-900">
              Riwayat Permohonan Peminjaman
            </h2>
            <span className="bg-slate-900 text-white font-bold text-xs px-2.5 py-0.5 rounded-md">
              {bookings.length}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold">
            <span>{historyAccordionOpen ? 'Sembunyikan' : 'Buka Riwayat'}</span>
            {historyAccordionOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {historyAccordionOpen && (
          <div className="p-6 space-y-4">
            {loading && bookings.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Memuat data riwayat peminjaman...
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Belum ada permohonan booking yang diajukan.
              </div>
            ) : (
              <div className="space-y-3.5">
                {bookings.map((b) => {
                  const startDate = new Date(b.startTime);
                  const dayNum = startDate.getDate();
                  const monthName = startDate.toLocaleDateString('id-ID', { month: 'short' });
                  const dateStr = startDate.toLocaleDateString('id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const sTime = startDate.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const eTime = new Date(b.endTime).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={b.id}
                      className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Date Square Badge + Info */}
                      <div className="flex items-start sm:items-center space-x-4">
                        {/* DentCare Signature Date Block */}
                        <div
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-center shrink-0 shadow-xs ${
                            b.status === 'disetujui'
                              ? 'bg-[#2A85FF] text-white shadow-blue-500/20'
                              : b.status === 'menunggu'
                              ? 'bg-amber-500 text-white shadow-amber-500/20'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <span className="text-xl sm:text-2xl font-bold leading-none">{dayNum}</span>
                          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold mt-0.5">
                            {monthName}
                          </span>
                        </div>

                        {/* Booking Details */}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{sTime} - {eTime} WIB</span>
                            <span>&bull;</span>
                            <span className="font-mono text-slate-400">#{b.id}</span>
                          </div>

                          <h4 className="text-base font-bold text-slate-900 leading-snug">
                            {b.roomName || b.roomId}
                          </h4>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span>
                              Peminjam: <strong className="text-slate-800">{b.userName}</strong>
                            </span>
                            {b.equipmentName && (
                              <span className="inline-flex items-center bg-white border border-slate-300 text-slate-800 text-[11px] px-2 py-0.5 rounded-md font-medium">
                                <Cpu className="w-3 h-3 mr-1 text-[#2A85FF]" />
                                {b.equipmentName}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 line-clamp-1 pt-0.5">
                            <span className="text-slate-400">Keperluan:</span> {b.purpose}
                          </p>

                          {b.status === 'ditolak' && b.rejectionReason && (
                            <p className="text-xs text-rose-600 font-medium">
                              Alasan ditolak: {b.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Status Pill & Action Buttons */}
                      <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {/* Status Tag */}
                        <div>
                          {b.status === 'disetujui' && (
                            <span className="inline-flex items-center bg-emerald-600 text-white font-semibold px-2.5 py-0.5 rounded-md text-xs">
                              Disetujui
                            </span>
                          )}
                          {b.status === 'menunggu' && (
                            <span className="inline-flex items-center bg-amber-500 text-white font-semibold px-2.5 py-0.5 rounded-md text-xs">
                              Menunggu
                            </span>
                          )}
                          {b.status === 'ditolak' && (
                            <span className="inline-flex items-center bg-rose-600 text-white font-semibold px-2.5 py-0.5 rounded-md text-xs">
                              Ditolak
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {b.status === 'disetujui' && (
                            <button
                              onClick={() => setActiveQrBooking(b)}
                              className="btn-pill-primary px-4 sm:px-5 py-2 text-xs font-semibold flex items-center shadow-sm"
                            >
                              <QrCode className="w-3.5 h-3.5 mr-1.5" />
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
                                className="btn-pill-secondary px-3.5 sm:px-4 py-2 text-xs font-semibold"
                              >
                                Ubah
                              </button>
                              <button
                                onClick={() => handleCancelBooking(b.id)}
                                className="btn-pill-danger px-3.5 sm:px-4 py-2 text-xs font-semibold"
                              >
                                Batal
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lazy-Loaded Modal QR Code */}
      {activeQrBooking && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center text-white">Memuat tiket...</div>}>
          <QrModal
            booking={activeQrBooking}
            onClose={() => setActiveQrBooking(null)}
          />
        </Suspense>
      )}

      {/* Modal Edit Permohonan Booking */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                Ubah Permohonan Booking
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">#{editingBooking.id}</p>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1.5 text-xs">Waktu Mulai Baru</label>
                <input
                  type="datetime-local"
                  min={minDateTime}
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 transition"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5 text-xs">Waktu Selesai Baru</label>
                <input
                  type="datetime-local"
                  min={editStart || minDateTime}
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 transition"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5 text-xs">Keperluan Penggunaan</label>
                <textarea
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 transition"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="btn-pill-secondary px-5 py-2 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-pill-primary px-6 py-2 text-xs font-semibold shadow-sm"
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
