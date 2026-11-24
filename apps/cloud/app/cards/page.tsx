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
      {/* Header: Direct flat typography without decorative nested boxes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
            Manajemen Kartu KTM RFID
          </h1>
          <p className="text-xs text-[#4A4A4A] mt-1">
            Pendaftaran UID fisik kartu ke identitas akun &bull; Disimpan dalam bentuk Hash SHA-256 (Hak Akses Kepala TU / Admin)
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Daftarkan Kartu KTM
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

      {/* Main Content Area */}
      {loading ? (
        <div className="p-8 text-center text-[#4A4A4A] text-xs font-semibold bg-white border border-[#E5E7EB] rounded-[4px]">
          Memuat daftar kartu...
        </div>
      ) : cards.length === 0 ? (
        <div className="p-8 text-center text-[#4A4A4A] text-xs bg-white rounded-[4px] border border-[#E5E7EB]">
          Belum ada kartu KTM RFID terdaftar.
        </div>
      ) : (
        <>
          {/* Desktop View: Flat Clean Table */}
          <div className="hidden md:block bg-white border border-[#E5E7EB] rounded-[4px] overflow-hidden">
            <table className="w-full text-left text-xs text-[#1A1A1A]">
              <thead className="bg-[#F8F9FA] border-b border-[#E5E7EB] text-[#4A4A4A] font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Label & ID</th>
                  <th className="py-3 px-4">Pemilik (Mahasiswa / Dosen)</th>
                  <th className="py-3 px-4">NIM / NIP</th>
                  <th className="py-3 px-4">Hash UID (SHA-256)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {cards.map((card) => (
                  <tr key={card.id} className="hover:bg-[#F8F9FA] transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-[#0066FF] shrink-0" />
                        <div>
                          <span className="font-bold text-[#1A1A1A] block">{card.label || 'KTM'}</span>
                          <span className="font-mono text-[10px] text-[#4A4A4A]">{card.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1A1A1A]">{card.userName}</td>
                    <td className="py-3 px-4 font-mono text-[#4A4A4A]">{card.userNim || '-'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#4A4A4A] break-all max-w-xs">
                      {card.cardHash}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-[11px] font-bold text-[#16A34A]">[AKTIF]</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1.5 text-[#4A4A4A] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-[2px] transition active:translate-y-[1px]"
                        title="Hapus Kartu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Flat Clean Cards (No Horizontal Scroll & No Nested Boxes) */}
          <div className="md:hidden space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="bg-white border border-[#E5E7EB] rounded-[4px] p-4 space-y-2.5"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-[#0066FF] shrink-0" />
                    <div>
                      <span className="font-bold text-sm text-[#1A1A1A] block leading-tight">
                        {card.label || 'KTM'}
                      </span>
                      <span className="font-mono text-[10px] text-[#4A4A4A]">{card.id}</span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-[#16A34A]">[AKTIF]</span>
                </div>

                <div className="text-xs space-y-1 pt-1 text-[#1A1A1A]">
                  <div className="flex justify-between">
                    <span className="text-[#4A4A4A]">Pemilik:</span>
                    <span className="font-semibold">{card.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4A4A4A]">NIM/NIP:</span>
                    <span className="font-mono">{card.userNim || '-'}</span>
                  </div>
                  <div className="pt-1">
                    <span className="text-[#4A4A4A] text-[10px] block mb-0.5">Hash UID:</span>
                    <span className="font-mono text-[10px] text-[#1A1A1A] break-all block bg-[#F8F9FA] p-1.5 rounded-[2px]">
                      {card.cardHash}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E7EB] flex justify-between items-center">
                  <span className="text-[10px] text-[#16A34A] font-semibold">Tersinkron ke Gateway</span>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="p-1.5 text-[#DC2626] hover:bg-[#FEE2E2] rounded-[2px] transition flex items-center space-x-1 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Registrasi Kartu */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-[#E5E7EB] rounded-[4px] max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-[#1A1A1A] pb-2 border-b border-[#E5E7EB]">
              Registrasi Kartu KTM RFID Baru
            </h3>
            <form onSubmit={handleRegisterCard} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">Target Pengguna</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                  required
                >
                  <option value="usr-001">Muhammad Isya Asyhari (21120121130001)</option>
                  <option value="usr-002">Dr. Ir. Danang Setiawan (197508152000031001)</option>
                  <option value="usr-003">Aryo Wicaksono, S.Kom. (198810202015041002)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  UID Fisik Kartu (Contoh: 01020304 atau A1B2C3D4)
                </label>
                <input
                  type="text"
                  value={rawUid}
                  onChange={(e) => setRawUid(e.target.value)}
                  placeholder="01020304"
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] font-mono bg-white text-[#1A1A1A]"
                  required
                />
                <p className="text-[11px] text-[#4A4A4A] mt-1">
                  UID langsung di-hash dengan SHA-256 dan pepper rahasia di server cloud sebelum disimpan.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">Label Kartu</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="KTM Utama Mahasiswa"
                  className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] bg-white text-[#1A1A1A]"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E5E7EB]">
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
