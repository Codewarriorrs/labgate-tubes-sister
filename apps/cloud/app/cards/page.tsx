'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/types';

export default function CardsPage() {
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
    if (!confirm('Apakah Anda yakin ingin menghapus kartu ini? Pengguna tidak akan dapat mengakses gate dengan kartu ini.')) return;
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
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#bae6fd] shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0f766e] bg-[#ddf4ff] px-2.5 py-1 rounded-lg border border-[#bae6fd] inline-block mb-2">
            Administrasi Identitas
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#3c3c3c] tracking-tight">
            Manajemen Kartu Identitas Mahasiswa (KTM RFID)
          </h1>
          <p className="text-xs text-[#777777] font-medium mt-1">
            Pendaftaran UID fisik kartu ke identitas akun &bull; Disimpan dalam bentuk Hash SHA-256 + Pepper (bukan teks asli)
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider self-start md:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Daftarkan Kartu KTM
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

      {/* Grid Kartu Terdaftar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-[#777777] text-xs font-bold">
            Memuat daftar kartu...
          </div>
        ) : cards.length === 0 ? (
          <div className="col-span-full p-8 text-center text-[#777777] text-xs font-medium bg-white rounded-2xl border-2 border-[#bae6fd]">
            Belum ada kartu KTM RFID terdaftar.
          </div>
        ) : cards.map((card) => (
          <div
            key={card.id}
            className="bg-white rounded-2xl p-5 shadow-sm border-2 border-[#bae6fd] flex flex-col justify-between hover:border-teal-400 transition"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0f766e] flex items-center justify-center text-white">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-[#3c3c3c] text-sm block">
                      {card.label || 'KTM Mahasiswa'}
                    </span>
                    <span className="text-[11px] text-[#777777]">ID Kartu: {card.id}</span>
                  </div>
                </div>

                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Aktif
                </span>
              </div>

              <div className="bg-[#f8fafc] rounded-xl p-3 text-[11px] text-[#3c3c3c] space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-[#777777]">Pemilik Kartu:</span>
                  <span className="font-bold">{card.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#777777]">NIM:</span>
                  <span className="font-medium">{card.userNim || 'Mahasiswa'}</span>
                </div>
                <div className="pt-1 border-t border-slate-200">
                  <span className="text-[#777777] block text-[10px] mb-0.5">Hash UID Kartu (SHA-256):</span>
                  <span className="font-mono text-[10px] text-teal-800 break-all block bg-teal-50/60 p-1.5 rounded-lg border border-teal-200">
                    {card.cardHash}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t-2 border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-teal-800 flex items-center font-bold">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#0f766e]" />
                Tersinkron ke Gateway
              </span>

              <button
                onClick={() => handleDeleteCard(card.id)}
                className="p-2 text-[#777777] hover:text-[#ef4444] hover:bg-red-50 rounded-xl transition"
                title="Hapus Kartu"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Registrasi Kartu */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border-2 border-[#bae6fd]">
            <h3 className="font-extrabold text-sm sm:text-base text-[#3c3c3c] mb-4 pb-2 border-b-2 border-slate-100">
              Registrasi Kartu KTM RFID Baru
            </h3>
            <form onSubmit={handleRegisterCard} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#3c3c3c] mb-1">Target Pengguna</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e] bg-white font-bold"
                  required
                >
                  <option value="usr-001">Muhammad Isya Asyhari (21120121130001)</option>
                  <option value="usr-002">Dr. Ir. Danang Setiawan (197508152000031001)</option>
                  <option value="usr-003">Aryo Wicaksono, S.Kom. (198810202015041002)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#3c3c3c] mb-1">
                  UID Fisik Kartu (Contoh: 01020304 atau A1B2C3D4)
                </label>
                <input
                  type="text"
                  value={rawUid}
                  onChange={(e) => setRawUid(e.target.value)}
                  placeholder="01020304"
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e] font-mono"
                  required
                />
                <p className="text-[11px] text-[#777777] mt-1 font-medium">
                  UID langsung di-hash dengan SHA-256 dan pepper rahasia di server cloud sebelum disimpan.
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#3c3c3c] mb-1">Label Kartu</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="KTM Utama Mahasiswa"
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e]"
                  required
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
