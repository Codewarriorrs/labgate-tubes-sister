'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/types';

export default function CardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Registrasi Kartu
  const [showAddModal, setShowAddModal] = useState(false);
  const [userId, setUserId] = useState('usr-001');
  const [rawUid, setRawUid] = useState('');
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const resCards = await fetch('/api/cards');
      if (resCards.status === 401) {
        router.push('/login');
        return;
      }
      const jsonCards = await resCards.json();
      if (jsonCards.success) {
        setCards(jsonCards.data);
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

  const handleRegisterCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rawUid, label }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', message: json.message });
        setShowAddModal(false);
        setRawUid('');
        setLabel('');
        fetchData();
      } else {
        setFeedback({ type: 'error', message: json.message });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Gagal mendaftarkan kartu' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Hapus kartu ini? Pengguna tidak akan dapat mengakses gate dengan kartu ini.')) return;
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.message);
      }
    } catch {
      alert('Gagal menghapus kartu');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Manajemen Kartu KTM RFID
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pendaftaran UID fisik kartu ke identitas akun &bull; Terenkripsi dengan Hash SHA-256
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-pill-primary self-start sm:self-auto px-6 py-2.5 text-xs font-semibold flex items-center shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Daftarkan Kartu KTM
        </button>
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

      {/* Quick Reference Simulasi Wokwi */}
      <div className="bg-[#EAF4FF] rounded-3xl p-6 border border-blue-100/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-[#2A85FF]">Preset Kartu RFID Simulasi Wokwi</h3>
          <p className="text-xs text-slate-600 mt-0.5">
            UID kartu fisik mahasiswa yang terpasang di reader RFID ESP32 Wokwi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-blue-200/60 text-xs text-slate-800 font-medium">
            <span className="font-bold text-[#2A85FF]">Isya:</span> 01020304 (21120124130051)
          </div>
          <div className="bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-blue-200/60 text-xs text-slate-800 font-medium">
            <span className="font-bold text-emerald-600">Malvin:</span> 11223344 (21120124130052)
          </div>
          <div className="bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-blue-200/60 text-xs text-slate-800 font-medium">
            <span className="font-bold text-amber-600">Bintang:</span> 55667788 (21120124130053)
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white border border-slate-100 rounded-3xl">
          Memuat daftar kartu...
        </div>
      ) : cards.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-100">
          Belum ada kartu KTM RFID terdaftar.
        </div>
      ) : (
        <div className="bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daftar Kartu Terdaftar
              </h2>
              <p className="text-xs text-slate-400">Kartu fisik yang memiliki izin akses pada gateway</p>
            </div>
            <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-md">
              {cards.length} Kartu
            </span>
          </div>

          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#EAF4FF] text-[#2A85FF] flex items-center justify-center shrink-0 shadow-xs">
                    <CreditCard className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span className="font-bold text-slate-900 text-sm">{card.label || 'KTM Mahasiswa'}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-slate-400">#{card.id}</span>
                    </div>

                    <div className="text-xs text-slate-700">
                      Pemilik: <strong className="text-slate-900">{card.userName}</strong>
                      {card.userNim && (
                        <span className="text-slate-500 ml-2 font-mono">({card.userNim})</span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 break-all max-w-xl">
                      Hash SHA-256: {card.uidHash}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold px-2.5 py-0.5 rounded-md text-xs">
                    Aktif &bull; Sinkron Gateway
                  </span>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="btn-pill-danger px-4 py-2 text-xs font-semibold flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Registrasi Kartu */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                Registrasi Kartu KTM RFID Baru
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Hubungkan identitas pemilik kartu ke gateway</p>
            </div>

            <form onSubmit={handleRegisterCard} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1.5 text-xs">Target Pengguna</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 bg-white text-slate-900 transition"
                  required
                >
                  <option value="usr_mhs_01">Isya (21120124130051)</option>
                  <option value="usr_mhs_02">Malvin (21120124130052)</option>
                  <option value="usr_mhs_03">Bintang (21120124130053)</option>
                  <option value="usr_dosen_01">Dr. Ir. Danang Setiawan, M.T. (197808202005011001)</option>
                  <option value="usr_admin_01">Aryo Wicaksono, S.Kom. (198503152010121002)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5 text-xs">
                  UID Fisik Kartu (Contoh: 01020304 atau 11223344)
                </label>
                <input
                  type="text"
                  value={rawUid}
                  onChange={(e) => setRawUid(e.target.value)}
                  placeholder="01020304"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 bg-white text-slate-900 transition"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  UID langsung di-hash dengan SHA-256 dan pepper rahasia di server cloud sebelum disimpan.
                </p>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5 text-xs">Label Kartu</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="KTM Utama Mahasiswa"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 bg-white text-slate-900 transition"
                  required
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
                  {submitting ? 'Mendaftarkan...' : 'Daftarkan Kartu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
