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
      {/* Header: Direct Typography, no nested boxes */}
      <div className="border-b border-[#E5E7EB] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
          Antrean Persetujuan Peminjaman Lab
        </h1>
        <p className="text-xs text-[#4A4A4A] mt-1">
          Halaman dosen pembimbing & pengelola lab untuk menyetujui atau menolak permohonan akses
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
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Daftar Antrean Pending */}
      <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center space-x-2">
            <ClipboardCheck className="w-4 h-4 text-[#0066FF]" />
            <h2 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
              Permohonan Menunggu Keputusan
            </h2>
          </div>
          <span className="font-mono text-xs font-bold text-[#D97706]">
            [{pendingBookings.length} Antrean]
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#4A4A4A] text-xs font-semibold">Memuat antrean...</div>
        ) : pendingBookings.length === 0 ? (
          <div className="p-8 text-center text-[#4A4A4A] text-xs">
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
                  className="rounded-[4px] border border-[#E5E7EB] p-4 flex flex-col justify-between space-y-3 bg-[#F8F9FA] hover:border-[#1A1A1A] transition"
                >
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-[#1A1A1A] text-sm block">
                          {b.userName}
                        </span>
                        <span className="text-[#4A4A4A] text-[11px] font-mono block">{b.id}</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase font-bold text-[#D97706]">
                        [Menunggu]
                      </span>
                    </div>

                    <div className="space-y-1 text-[#1A1A1A]">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0066FF]" />
                        <span className="font-semibold">
                          {b.roomName || b.roomId} ({b.roomCode || b.roomId})
                        </span>
                      </div>

                      {b.equipmentName && (
                        <div className="flex items-center space-x-1.5 text-[#4A4A4A]">
                          <Cpu className="w-3.5 h-3.5 text-[#0066FF]" />
                          <span>Alat: {b.equipmentName}</span>
                        </div>
                      )}

                      <div className="flex items-center space-x-1.5 text-[#4A4A4A]">
                        <Clock className="w-3.5 h-3.5 text-[#0066FF]" />
                        <span>{startStr} - {endStr} WIB</span>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-[2px] border border-[#E5E7EB]">
                      <span className="text-[10px] uppercase font-semibold text-[#4A4A4A] block mb-0.5">
                        Keperluan Penggunaan:
                      </span>
                      <p className="text-[#1A1A1A] font-medium">{b.purpose}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => handleApprove(b.id)}
                      disabled={actionLoading}
                      className="flex-1 btn-primary py-1.5 text-xs flex items-center justify-center space-x-1 disabled:opacity-50"
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
                      className="flex-1 btn-danger py-1.5 text-xs flex items-center justify-center space-x-1 disabled:opacity-50"
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

      {/* Riwayat Keputusan: Responsive Flat Table on Desktop & Cards on Mobile */}
      <div className="bg-white border border-[#E5E7EB] rounded-[4px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E7EB]">
          <h2 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
            Riwayat Keputusan Approval
          </h2>
        </div>

        {pastBookings.length === 0 ? (
          <div className="p-8 text-center text-[#4A4A4A] text-xs">
            Belum ada riwayat keputusan approval.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1A1A1A]">
                <thead className="bg-[#F8F9FA] text-[11px] font-semibold text-[#4A4A4A] uppercase tracking-wider border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-5 py-2.5">ID & Pengguna</th>
                    <th className="px-5 py-2.5">Ruangan</th>
                    <th className="px-5 py-2.5">Waktu</th>
                    <th className="px-5 py-2.5">Keperluan</th>
                    <th className="px-5 py-2.5">Status / Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {pastBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F8F9FA] transition">
                      <td className="px-5 py-3">
                        <span className="font-semibold text-[#1A1A1A] block">{b.id}</span>
                        <span className="text-[#4A4A4A] text-[11px]">{b.userName}</span>
                      </td>
                      <td className="px-5 py-3 font-medium">
                        {b.roomName || b.roomId}
                      </td>
                      <td className="px-5 py-3 text-[#4A4A4A]">
                        {new Date(b.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}{' '}
                        {new Date(b.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3 max-w-xs truncate" title={b.purpose}>
                        {b.purpose}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`font-mono text-[11px] uppercase font-bold ${
                            b.status === 'disetujui'
                              ? 'text-[#16A34A]'
                              : b.status === 'ditolak'
                              ? 'text-[#DC2626]'
                              : 'text-[#4A4A4A]'
                          }`}
                        >
                          [{b.status}]
                        </span>
                        {b.rejectionReason && (
                          <span className="block text-[11px] text-[#DC2626] mt-0.5 truncate max-w-xs">{b.rejectionReason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Zero Horizontal Scroll) */}
            <div className="md:hidden divide-y divide-[#E5E7EB]">
              {pastBookings.map((b) => (
                <div key={b.id} className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-sm text-[#1A1A1A] block">{b.userName}</span>
                      <span className="font-mono text-[10px] text-[#4A4A4A]">{b.id}</span>
                    </div>
                    <span
                      className={`font-mono text-[10px] uppercase font-bold ${
                        b.status === 'disetujui'
                          ? 'text-[#16A34A]'
                          : b.status === 'ditolak'
                          ? 'text-[#DC2626]'
                          : 'text-[#4A4A4A]'
                      }`}
                    >
                      [{b.status}]
                    </span>
                  </div>

                  <div className="space-y-1 text-[#1A1A1A]">
                    <div className="flex justify-between">
                      <span className="text-[#4A4A4A]">Ruangan:</span>
                      <span className="font-semibold">{b.roomName || b.roomId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#4A4A4A]">Waktu:</span>
                      <span>
                        {new Date(b.startTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}{' '}
                        {new Date(b.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[#4A4A4A]">
                      <strong className="text-[#1A1A1A]">Keperluan:</strong> {b.purpose}
                    </p>
                    {b.rejectionReason && (
                      <p className="text-[#DC2626] text-[11px]">
                        <strong>Alasan Tolak:</strong> {b.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Tolak Booking */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-[#1A1A1A]">
              Tolak Permohonan Peminjaman ({rejectingBooking.id})
            </h3>
            <p className="text-xs text-[#4A4A4A]">
              Sebutkan alasan penolakan secara jelas agar mahasiswa dapat memperbaiki jadwal atau permohonannya.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Catatan Alasan Penolakan
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Bentrok dengan praktikum reguler mahasiswa..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#DC2626] bg-white text-[#1A1A1A]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  className="btn-secondary px-4 py-1.5 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-danger px-4 py-1.5 text-xs"
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
