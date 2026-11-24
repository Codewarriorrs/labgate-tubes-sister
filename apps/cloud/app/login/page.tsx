'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Key, Mail, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.message || 'Login gagal. Periksa kembali email dan password');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setErrorMsg('Tidak dapat terhubung ke server. Pastikan koneksi aktif.');
      setLoading(false);
    }
  };

  const setDemoUser = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('Semarang2026!');
    setErrorMsg(null);
  };

  return (
    <div className="max-w-md mx-auto my-6 sm:my-10">
      <div className="bg-white rounded-2xl shadow-md border-2 border-[#bae6fd] overflow-hidden">
        {/* Header */}
        <div className="bg-[#0f766e] border-b-4 border-[#134e4a] px-6 py-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 font-extrabold text-2xl border-2 border-white/30 shadow-inner">
            LG
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Portal Akses LabGate</h1>
          <p className="text-xs text-teal-100 font-medium mt-1">
            Fakultas Teknik &bull; Kampus Tembalang Semarang
          </p>
        </div>

        {/* Form */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border-2 border-red-200 text-red-900 text-xs font-medium flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#3c3c3c] uppercase tracking-wider mb-1.5">
                Email Kampus
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-[#777777]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@students.undip.ac.id"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e] transition bg-white text-[#3c3c3c]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#3c3c3c] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-3.5 text-[#777777]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border-2 border-slate-200 focus:outline-none focus:border-[#0f766e] transition bg-white text-[#3c3c3c]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-xs font-extrabold uppercase tracking-wider disabled:opacity-60"
            >
              {loading ? (
                <span>Memproses Masuk...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  <span>Masuk ke LabGate</span>
                </>
              )}
            </button>
          </form>

          {/* Akun Demo Cepat */}
          <div className="mt-6 pt-5 border-t-2 border-slate-100">
            <span className="text-xs font-extrabold text-[#777777] uppercase tracking-wider block mb-2.5 text-center">
              Pilih Akun Demo Kampus
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => setDemoUser('isya.asyhari@students.undip.ac.id')}
                className="text-left p-3 rounded-xl border-2 border-slate-200 hover:border-[#bae6fd] hover:bg-[#ddf4ff]/40 transition text-xs flex justify-between items-center group active:scale-[0.99]"
              >
                <div>
                  <span className="font-bold text-[#3c3c3c] block group-hover:text-[#0f766e]">
                    Muhammad Isya Asyhari
                  </span>
                  <span className="text-[#777777] text-[11px]">Mahasiswa (KTM RFID: 01020304)</span>
                </div>
                <span className="px-2.5 py-1 bg-[#ddf4ff] text-[#0f766e] text-[10px] font-extrabold rounded-lg border border-[#bae6fd]">
                  Mahasiswa
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('danang.setiawan@undip.ac.id')}
                className="text-left p-3 rounded-xl border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition text-xs flex justify-between items-center group active:scale-[0.99]"
              >
                <div>
                  <span className="font-bold text-[#3c3c3c] block group-hover:text-emerald-900">
                    Dr. Ir. Danang Setiawan, M.T.
                  </span>
                  <span className="text-[#777777] text-[11px]">Dosen Pembimbing Lab</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-[10px] font-extrabold rounded-lg border border-emerald-300">
                  Dosen
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('aryo.wicaksono@undip.ac.id')}
                className="text-left p-3 rounded-xl border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition text-xs flex justify-between items-center group active:scale-[0.99]"
              >
                <div>
                  <span className="font-bold text-[#3c3c3c] block group-hover:text-amber-900">
                    Aryo Wicaksono, S.Kom.
                  </span>
                  <span className="text-[#777777] text-[11px]">Kepala Tata Usaha & Gate Admin</span>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[10px] font-extrabold rounded-lg border border-amber-300">
                  Admin
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
