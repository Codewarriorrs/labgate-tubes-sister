'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, CheckCircle2, XCircle, Clock, MapPin, AlertCircle, Cpu } from 'lucide-react';
import { Booking } from '@/types';

export default function ApprovalPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bookings');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setBookings(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/bookings/${id}/decision`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'disetujui' }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', message: json.message });
        fetchBookings();
      } else {
        setFeedback({ type: 'error', message: json.message });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menghubungkan ke server' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBooking) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/bookings/${rejectingBooking.id}/decision`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'ditolak', rejectionReason }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', message: json.message });
        setRejectingBooking(null);
        setRejectionReason('');
        fetchBookings();
      } else {
        setFeedback({ type: 'error', message: json.message });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menghubungkan ke server' });
    } finally {
      setActionLoading(false);
    }
  };

  const pendingBookings = bookings.filter((b) => b.status === 'menunggu');
  const pastBookings = bookings.filter((b) => b.status !== 'menunggu');

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Antrean Persetujuan Peminjaman Lab
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Verifikasi dan berikan keputusan akses laboratorium bagi civitas akademika
          </p>
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

      {/* Daftar Antrean Pending (DentCare Cards - Bebas Nested Box) */}
      <div className="bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#2A85FF] flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Permohonan Menunggu Keputusan
              </h2>
              <p className="text-xs text-slate-400">Peminjaman yang memerlukan persetujuan dosen</p>
            </div>
          </div>
          <span className="bg-[#0F172A] text-white text-xs font-semibold px-2.5 py-1 rounded-md">
            {pendingBookings.length} Antrean
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Memuat antrean...</div>
        ) : pendingBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Tidak ada permohonan booking yang menunggu persetujuan saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingBookings.map((b) => {
              const startDate = new Date(b.startTime);
              const dayNum = startDate.getDate();
              const monthName = startDate.toLocaleDateString('id-ID', { month: 'short' });
              const startStr = startDate.toLocaleString('id-ID', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              const endStr = new Date(b.endTime).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                /* DentCare Card - Bersih tanpa nested box berlebihan */
                <div
                  key={b.id}
                  className="rounded-3xl border border-slate-100 p-6 flex flex-col justify-between space-y-5 bg-white hover:shadow-lg transition shadow-xs"
                >
                  <div className="space-y-4">
                    {/* Header Peminjam & Date Square + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex flex-col items-center justify-center font-bold text-center shrink-0 shadow-xs shadow-amber-500/20">
                          <span className="text-base font-bold leading-none">{dayNum}</span>
                          <span className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">{monthName}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-base block leading-tight">
                            {b.userName}
                          </span>
                          <span className="text-xs font-mono text-slate-400 mt-0.5 block">{b.id}</span>
                        </div>
                      </div>
                      <span className="bg-amber-500 text-white font-semibold px-2.5 py-0.5 rounded-md text-xs shrink-0">
                        Menunggu
                      </span>
                    </div>

                    {/* Informasi Lokasi, Alat, & Jadwal */}
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex items-center space-x-2 text-slate-800 font-semibold">
                        <MapPin className="w-4 h-4 text-[#2A85FF] shrink-0" />
                        <span>
                          {b.roomName || b.roomId} ({b.roomCode || b.roomId})
                        </span>
                      </div>

                      {b.equipmentName && (
                        <div className="flex items-center space-x-2 text-slate-800">
                          <Cpu className="w-4 h-4 shrink-0 text-[#2A85FF]" />
                          <span className="font-medium bg-white border border-slate-300 px-2 py-0.5 rounded-md">
                            Alat: {b.equipmentName}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 text-slate-500">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>{startStr} - {endStr} WIB</span>
                      </div>
                    </div>

                    {/* Keperluan Langsung Ditampilkan Tanpa Nested Box */}
                    <div className="pt-2 text-xs text-slate-600">
                      <span className="text-slate-400 font-semibold block mb-0.5">
                        Keperluan Penggunaan:
                      </span>
                      <p className="text-slate-800 font-medium leading-relaxed">
                        {b.purpose}
                      </p>
                    </div>
                  </div>

                  {/* Tombol Aksi DentCare: Obsidian Black Pill & Red Outline Pill */}
                  <div className="flex items-center space-x-2.5 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleApprove(b.id)}
                      disabled={actionLoading}
                      className="flex-1 btn-pill-primary py-2.5 text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Setujui</span>
                    </button>
                    <button
                      onClick={() => {
                        setRejectingBooking(b);
                        setRejectionReason('');
                      }}
                      disabled={actionLoading}
                      className="flex-1 btn-pill-danger py-2.5 text-xs font-semibold flex items-center justify-center space-x-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Tolak</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Riwayat Keputusan: DentCare Horizontal Cards */}
      <div className="bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Riwayat Keputusan Approval
            </h2>
            <p className="text-xs text-slate-400">Catatan permohonan yang telah disetujui atau ditolak</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
            Total {pastBookings.length} Keputusan
          </span>
        </div>

        {pastBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Belum ada riwayat keputusan approval.
          </div>
        ) : (
          <div className="space-y-3.5">
            {pastBookings.map((b) => {
              const startDate = new Date(b.startTime);
              const dayNum = startDate.getDate();
              const monthName = startDate.toLocaleDateString('id-ID', { month: 'short' });
              const sTime = startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
              const eTime = new Date(b.endTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center space-x-4">
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-center shrink-0 shadow-xs ${
                        b.status === 'disetujui'
                          ? 'bg-[#2A85FF] text-white shadow-blue-500/20'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <span className="text-xl sm:text-2xl font-bold leading-none">{dayNum}</span>
                      <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold mt-0.5">{monthName}</span>
                    </div>

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
                        <span>Peminjam: <strong className="text-slate-800">{b.userName}</strong></span>
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

                  <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {b.status === 'disetujui' ? (
                      <span className="inline-flex items-center bg-emerald-600 text-white font-semibold px-2.5 py-0.5 rounded-md text-xs">
                        Disetujui
                      </span>
                    ) : (
                      <span className="inline-flex items-center bg-rose-600 text-white font-semibold px-2.5 py-0.5 rounded-md text-xs">
                        Ditolak
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Tolak Booking */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                Tolak Permohonan Peminjaman
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">#{rejectingBooking.id}</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sebutkan alasan penolakan secara jelas agar mahasiswa dapat memperbaiki jadwal atau permohonannya.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Catatan Alasan Penolakan
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Bentrok dengan jadwal praktikum reguler mahasiswa..."
                  rows={3}
                  required
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-500/10 bg-white text-slate-900 transition"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  className="btn-pill-secondary px-5 py-2 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-pill-danger px-5 py-2 text-xs font-semibold shadow-sm"
                >
                  {actionLoading ? 'Menolak...' : 'Konfirmasi Tolak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
