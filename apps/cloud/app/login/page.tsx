'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Key, Mail, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    name: 'Isya',
    email: 'isya.asyhari@students.undip.ac.id',
    desc: 'Mahasiswa (NIM: 21120124130051 - RFID: 01020304)',
    role: 'Mahasiswa',
    roleColor: 'text-[#2A85FF]',
  },
  {
    name: 'Malvin',
    email: 'malvin@students.undip.ac.id',
    desc: 'Mahasiswa (RFID: 11223344)',
    role: 'Mahasiswa',
    roleColor: 'text-[#2A85FF]',
  },
  {
    name: 'Bintang',
    email: 'bintang@students.undip.ac.id',
    desc: 'Mahasiswa (RFID: 55667788)',
    role: 'Mahasiswa',
    roleColor: 'text-[#2A85FF]',
  },
  {
    name: 'Dr. Ir. Danang Setiawan, M.T.',
    email: 'danang.setiawan@undip.ac.id',
    desc: 'Dosen Pembimbing & Approval Lab',
    role: 'Dosen',
    roleColor: 'text-emerald-600',
  },
  {
    name: 'Aryo Wicaksono, S.Kom.',
    email: 'aryo.wicaksono@undip.ac.id',
    desc: 'Kepala Tata Usaha & Admin Gateway',
    role: 'Admin TU',
    roleColor: 'text-purple-600',
  },
];

export default function LoginPage() {
  const router = useRouter();
  // Inisialisasi awal dengan akun demo Isya agar input field langsung terisi saat halaman dibuka
  const [email, setEmail] = useState('isya.asyhari@students.undip.ac.id');
  const [password, setPassword] = useState('Semarang2026!');
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
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-10 space-y-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        {/* Header dengan Logo */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto mb-2 flex items-center justify-center">
            <img
              src="/logo-labgate.png"
              alt="Logo LabGate"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Masuk ke LabGate
          </h1>
          <p className="text-xs text-slate-500">
            Sistem Reservasi & Kontrol Akses Offline-First Laboratorium
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Email Kampus
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@students.undip.ac.id"
                required
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 text-slate-900 bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 text-slate-900 bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F172A] hover:bg-black text-white font-semibold rounded-full py-3 text-sm shadow-sm transition-all duration-150 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Memproses Masuk...' : 'Masuk ke Sistem'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Belum memiliki akun?{' '}
          <Link href="/register" className="text-[#2A85FF] font-semibold hover:underline">
            Daftar di sini
          </Link>
        </div>

        {/* Akun Demo Cepat */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              PILIH AKUN DEMO PENGUJIAN
            </span>
            <span className="text-[11px] text-[#2A85FF] font-medium">
              Klik untuk autofill
            </span>
          </div>
          <div className="space-y-2 text-xs">
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = email === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => setDemoUser(acc.email)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex justify-between items-center group cursor-pointer ${
                    isSelected
                      ? 'border-[#2A85FF] bg-[#EAF4FF] ring-2 ring-[#2A85FF]/20 shadow-xs'
                      : 'border-slate-100 hover:border-[#2A85FF]/50 hover:bg-[#EAF4FF]/40 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-slate-900 block group-hover:text-[#2A85FF] transition">
                        {acc.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-[#2A85FF] bg-white px-1.5 py-0.5 rounded border border-blue-200">
                          Aktif di Form
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">{acc.desc}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold text-xs ${acc.roleColor}`}>
                      {acc.role}
                    </span>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2A85FF] shrink-0" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2A85FF] transition shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
