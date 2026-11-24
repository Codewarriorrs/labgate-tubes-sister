'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardCheck, CheckCircle2, XCircle, Clock, MapPin, AlertCircle, Cpu } from 'lucide-react';
import { Booking } from '@/types';

export default function ApprovalPage() {
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
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#bae6fd] shadow-sm">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0f766e] bg-[#ddf4ff] px-2.5 py-1 rounded-lg border border-[#bae6fd] inline-block mb-2">
          Portal Dosen & Admin
        </span>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#3c3c3c] tracking-tight">
          Antrean Persetujuan Peminjaman Lab
        </h1>
        <p className="text-xs text-[#777777] font-medium mt-1">
          Halaman dosen pembimbing & admin laboratorium untuk menyetujui atau menolak permohonan akses
        </p>
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

      {/* Daftar Antrean Pending */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-[#bae6fd] p-5 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0f766e] flex items-center justify-center text-white font-bold">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#3c3c3c]">
              Permohonan Menunggu Keputusan
            </h2>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-extrabold text-xs">
            {pendingBookings.length} Antrean
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#777777] text-xs font-bold">Memuat antrean...</div>
        ) : pendingBookings.length === 0 ? (
          <div className="p-8 text-center text-[#777777] text-xs font-medium">
            Tidak ada permohonan booking yang menunggu persetujuan saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingBookings.map((b) => {
              const startStr = new Date(b.startTime).toLocaleString('id-ID', {
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
                <div
                  key={b.id}
                  className="rounded-2xl border-2 border-slate-200 p-4 hover:border-[#bae6fd] hover:bg-[#ddf4ff]/20 transition flex flex-col justify-between space-y-3 bg-white"
                >
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-extrabold text-[#3c3c3c] text-sm block">
                          {b.userName}
                        </span>
                        <span className="text-[#777777] text-[11px] block">{b.id}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] uppercase">
                        Menunggu Approval
                      </span>
                    </div>

                    <div className="space-y-1 text-[#3c3c3c]">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0f766e]" />
                        <span className="font-bold">
                          {b.roomName || b.roomId} ({b.roomCode || b.roomId})
                        </span>
                      </div>

                      {b.equipmentName && (
                        <div className="flex items-center space-x-1.5">
                          <Cpu className="w-3.5 h-3.5 text-[#0f766e]" />
                          <span className="text-[#3c3c3c] font-medium">Alat: {b.equipmentName}</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#0f766e]" />
                        <span className="font-medium">{startStr} - {endStr} WIB</span>
                      </div>
                    </div>

                    <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-[#777777] block mb-1">
                        Keperluan Penggunaan:
                      </span>
                      <p className="text-[#3c3c3c] italic font-medium">{b.purpose}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t-2 border-slate-100">
                    <button
                      onClick={() => handleApprove(b.id)}
                      disabled={actionLoading}
                      className="flex-1 py-2 px-3 bg-[#0f766e] hover:bg-[#115e59] text-white rounded-xl text-xs font-extrabold border-b-4 border-[#134e4a] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center space-x-1 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Setujui</span>
                    </button>
                    <button
                      onClick={() => {
                        setRejectingBooking(b);
                        setRejectionReason('');
                      }}
                      disabled={actionLoading}
                      className="flex-1 py-2 px-3 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl text-xs font-extrabold border-b-4 border-[#b91c1c] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center space-x-1 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Riwayat Keputusan */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-[#bae6fd] overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-slate-100">
          <h2 className="text-sm sm:text-base font-extrabold text-[#3c3c3c]">
            Riwayat Keputusan Approval
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#3c3c3c]">
            <thead className="bg-[#f0f9ff] text-[10px] font-extrabold text-[#777777] uppercase tracking-wider border-b-2 border-slate-100">
              <tr>
                <th className="px-5 py-3">ID & Pengguna</th>
                <th className="px-5 py-3">Ruangan</th>
                <th className="px-5 py-3">Waktu</th>
                <th className="px-5 py-3">Keperluan</th>
                <th className="px-5 py-3">Status / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pastBookings.map((b) => (
                <tr key={b.id} className="hover:bg-[#ddf4ff]/20 transition">
                  <td className="px-5 py-3.5">
                    <span className="font-extrabold text-[#3c3c3c] block">{b.id}</span>
                    <span className="text-[#777777] text-[11px]">{b.userName}</span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-[#3c3c3c]">
                    {b.roomName || b.roomId}
                  </td>
                  <td className="px-5 py-3.5">
                    {new Date(b.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}{' '}
                    {new Date(b.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-3.5 max-w-xs truncate" title={b.purpose}>
                    {b.purpose}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase border ${
                        b.status === 'disetujui'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : b.status === 'ditolak'
                          ? 'bg-red-100 text-red-900 border-red-300'
                          : 'bg-slate-100 text-[#777777] border-slate-200'
                      }`}
                    >
                      {b.status}
                    </span>
                    {b.rejectionReason && (
                      <span className="block text-[10px] text-red-700 mt-0.5 font-bold">{b.rejectionReason}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tolak Booking */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border-2 border-[#bae6fd]">
            <h3 className="font-extrabold text-sm sm:text-base text-[#3c3c3c] mb-2">
              Tolak Permohonan Peminjaman ({rejectingBooking.id})
            </h3>
            <p className="text-xs text-[#777777] font-medium mb-4">
              Sebutkan alasan penolakan secara jelas agar mahasiswa dapat memperbaiki jadwal atau permohonannya.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#3c3c3c] mb-1">
                  Catatan Alasan Penolakan
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Bentrok dengan praktikum reguler mahasiswa D3..."
                  rows={3}
                  required
                  className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#ef4444]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-danger px-4 py-2 text-xs"
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
