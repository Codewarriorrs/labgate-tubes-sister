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

    // 2. Validasi Jam Kerja (06.00 - 19.00 WIB)
    const startHour = startDate.getHours();
    const endHour = endDate.getHours();
    const endMin = endDate.getMinutes();

    if (startHour < 6) {
      setFeedback({
        type: 'error',
        message: 'Peminjaman laboratorium hanya diperbolehkan mulai pukul 06.00 WIB.',
      });
      return;
    }
    if (endHour > 19 || (endHour === 19 && endMin > 0)) {
      setFeedback({
        type: 'error',
        message: 'Peminjaman laboratorium hanya diperbolehkan maksimal hingga pukul 19.00 WIB.',
      });
      return;
    }

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
        {/* Card Kiri (Formulir Peminjaman Baru) - 65% Lebar */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 shadow-xs rounded-xl p-6 space-y-5">
          <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3.5">
            <CalendarPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Formulir Peminjaman Baru
            </h2>
          </div>

          <form onSubmit={handleCreateBooking} className="space-y-4">
            {/* Dropdown Ruang Laboratorium Cukup Lebar */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Ruang Laboratorium
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => {
                  setSelectedRoomId(e.target.value);
                  setSelectedEquipmentIds([]);
                }}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-900 transition"
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
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs space-y-1.5">
              <div className="flex items-center space-x-1.5 text-slate-700 font-semibold">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Jadwal Terisi pada {currentRoom?.name || 'Ruangan'}:</span>
              </div>
              {occupiedSlotsForSelectedRoom.length === 0 ? (
                <p className="text-emerald-700 font-medium">
                  Belum ada peminjaman aktif &bull; Semua slot jam 06.00 – 19.00 WIB tersedia.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
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
                        className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-mono"
                      >
                        {day}: {s}–{e} WIB ({slot.userName.split(' ')[0]})
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Input Waktu Mulai & Selesai (Restriksi Masa Lalu & Jam Kerja) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Waktu Mulai Akses (Min. 06.00 WIB)
                </label>
                <input
                  type="datetime-local"
                  min={minDateTime}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-900 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Waktu Selesai Akses (Maks. 19.00 WIB)
                </label>
                <input
                  type="datetime-local"
                  min={startTime || minDateTime}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-900 transition"
                  required
                />
              </div>
            </div>

            {/* Multi-Select Chips/Tags untuk Alat Lab Tambahan */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Alat Lab Tambahan (Pilih satu atau beberapa)
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
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Cpu className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span>{eq.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Keperluan Penggunaan */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Keperluan Penggunaan & Riset
              </label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Jelaskan tujuan peminjaman laboratorium, praktikum, atau penelitian..."
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-900 transition"
                required
              />
            </div>

            {/* Tombol Utama: Biru Gradasi Ungu */}
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

        {/* Card Kanan (Ketersediaan Ruangan) - 35% Lebar & Interaktif Clickable */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 shadow-xs rounded-xl p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <DoorOpen className="w-5 h-5 text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Ketersediaan Ruangan
            </h2>
          </div>

          <p className="text-xs text-slate-500">
            Klik kartu ruangan di bawah untuk memilihnya langsung pada formulir:
          </p>

          <div className="space-y-2.5">
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
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-slate-900">{r.code}</span>
                    {/* Modern Status Badge with Dot Indicator */}
                    {isOnline ? (
                      <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Tersedia</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span>Offline / Tutup</span>
                      </span>
                    )}
                  </div>

                  {/* Nama Lengkap Ruangan (Maks 2 Baris Tanpa Terpotong) */}
                  <h3 className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">
                    {r.name}
                  </h3>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>Kapasitas: {r.capacity} praktikan</span>
                    {isSelected && (
                      <span className="text-blue-600 font-semibold text-[11px]">Terpilih</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section Bawah: Riwayat Permohonan Peminjaman (Accordion / Dropdown) */}
      <div className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setHistoryAccordionOpen(!historyAccordionOpen)}
          className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50/80 transition text-left"
        >
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-semibold text-slate-900">
              Riwayat Permohonan Peminjaman
            </h2>
            <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {bookings.length}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-slate-500 text-xs">
            <span>{historyAccordionOpen ? 'Sembunyikan' : 'Buka Riwayat'}</span>
            {historyAccordionOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {historyAccordionOpen && (
          <div className="border-t border-slate-100">
            {loading && bookings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Memuat data riwayat peminjaman...
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Belum ada permohonan booking yang diajukan.
              </div>
            ) : (
              <>
                {/* Desktop View: Table dengan Proporsi Kolom yang Seimbang */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left table-fixed">
                    <colgroup>
                      <col className="w-[20%]" />
                      <col className="w-[30%]" />
                      <col className="w-[16%]" />
                      <col className="w-[18%]" />
                      <col className="w-[8%]" />
                      <col className="w-[8%]" />
                    </colgroup>
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3">Peminjam</th>
                        <th className="px-5 py-3">Ruangan & Alat</th>
                        <th className="px-5 py-3">Jadwal</th>
                        <th className="px-5 py-3">Keperluan</th>
                        <th className="px-5 py-3 text-center">Status</th>
                        <th className="px-5 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                      {bookings.map((b) => {
                        const dateStr = new Date(b.startTime).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                        const sTime = new Date(b.startTime).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const eTime = new Date(b.endTime).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/70 transition">
                            {/* Kolom 1: Peminjam (Hierarki Dibalik: Nama Bold, ID Mono di bawah) */}
                            <td className="px-5 py-3.5">
                              <span className="font-semibold text-slate-900 block leading-tight">
                                {b.userName}
                              </span>
                              <span className="text-xs font-mono text-slate-400 mt-0.5 block">
                                {b.id}
                              </span>
                            </td>

                            {/* Kolom 2: Ruangan & Alat (Compact Chip/Tag) */}
                            <td className="px-5 py-3.5">
                              <span className="font-medium text-slate-800 block line-clamp-1">
                                {b.roomName || b.roomId}
                              </span>
                              {b.equipmentName && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {b.equipmentName.split(',').map((eq, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-md font-medium"
                                    >
                                      <Cpu className="w-3 h-3 mr-1" />
                                      {eq.trim()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Kolom 3: Jadwal (2 Baris Ringkas) */}
                            <td className="px-5 py-3.5 text-xs text-slate-600">
                              <span className="font-medium text-slate-900 block">{dateStr}</span>
                              <span className="text-slate-500 block">{sTime} – {eTime} WIB</span>
                            </td>

                            {/* Kolom 4: Keperluan (line-clamp-2) */}
                            <td className="px-5 py-3.5 text-xs text-slate-600">
                              <p className="line-clamp-2" title={b.purpose}>
                                {b.purpose}
                              </p>
                              {b.status === 'ditolak' && b.rejectionReason && (
                                <p className="text-rose-600 text-[11px] mt-0.5 truncate" title={b.rejectionReason}>
                                  Alasan: {b.rejectionReason}
                                </p>
                              )}
                            </td>

                            {/* Kolom 5: Status (Soft Pill Badge) */}
                            <td className="px-5 py-3.5 text-center">
                              {b.status === 'disetujui' && (
                                <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                  Disetujui
                                </span>
                              )}
                              {b.status === 'menunggu' && (
                                <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                  Menunggu
                                </span>
                              )}
                              {b.status === 'ditolak' && (
                                <span className="inline-block bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                  Ditolak
                                </span>
                              )}
                            </td>

                            {/* Kolom 6: Aksi (Compact Gradient QR Button & Hover Icons) */}
                            <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                              {b.status === 'disetujui' && (
                                <button
                                  onClick={() => setActiveQrBooking(b)}
                                  className="btn-accent px-3 py-1.5 text-xs font-medium rounded-lg"
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
                                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                    title="Ubah Jadwal"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleCancelBooking(b.id)}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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

                {/* Mobile View: Cards Mandiri (Zero Horizontal Scroll) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {bookings.map((b) => {
                    const dateStr = new Date(b.startTime).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                    const sTime = new Date(b.startTime).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const eTime = new Date(b.endTime).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={b.id} className="p-4 space-y-2.5 text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold text-slate-900 block leading-tight">
                              {b.userName}
                            </span>
                            <span className="text-xs font-mono text-slate-400">{b.id}</span>
                          </div>
                          {b.status === 'disetujui' && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              Disetujui
                            </span>
                          )}
                          {b.status === 'menunggu' && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              Menunggu
                            </span>
                          )}
                          {b.status === 'ditolak' && (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              Ditolak
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-slate-600">
                          <div className="font-medium text-slate-800">
                            {b.roomName || b.roomId}
                          </div>
                          {b.equipmentName && (
                            <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                              Alat: {b.equipmentName}
                            </span>
                          )}
                          <div className="text-slate-500">
                            {dateStr} &bull; {sTime} – {eTime} WIB
                          </div>
                          <p className="text-slate-700 pt-0.5">
                            <strong>Keperluan:</strong> {b.purpose}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                          {b.status === 'disetujui' && (
                            <button
                              onClick={() => setActiveQrBooking(b)}
                              className="btn-accent px-3 py-1.5 text-xs font-medium"
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
                                className="btn-secondary px-3 py-1.5 text-xs"
                              >
                                Ubah
                              </button>
                              <button
                                onClick={() => handleCancelBooking(b.id)}
                                className="text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 text-xs"
                              >
                                Batal
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-semibold text-base text-slate-900 pb-2 border-b border-slate-100">
              Ubah Permohonan Booking ({editingBooking.id})
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block font-medium text-slate-700 mb-1 text-xs">Waktu Mulai Baru</label>
                <input
                  type="datetime-local"
                  min={minDateTime}
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 text-xs">Waktu Selesai Baru</label>
                <input
                  type="datetime-local"
                  min={editStart || minDateTime}
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 text-xs">Keperluan Penggunaan</label>
                <textarea
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-4 py-2 text-xs"
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
