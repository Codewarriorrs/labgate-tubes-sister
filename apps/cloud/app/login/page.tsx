'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Key, Mail, AlertCircle } from 'lucide-react';

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
      <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-6 sm:p-8 space-y-6">
        {/* Header dengan Logo */}
        <div className="text-center space-y-2">
          <img
            src="/logo-labgate.png"
            alt="Logo LabGate"
            className="w-14 h-14 object-contain mx-auto mb-2"
          />
          <h1 className="text-xl font-bold text-[#1A1A1A] tracking-tight">
            Masuk ke Portal LabGate
          </h1>
          <p className="text-xs text-[#4A4A4A]">
            Fakultas Teknik &bull; Kampus Tembalang Semarang
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-[4px] text-xs text-[#DC2626] flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
              Email Kampus
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-[#4A4A4A]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@students.undip.ac.id"
                required
                className="w-full pl-9 pr-3 py-2 text-xs rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] text-[#1A1A1A] bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3 top-3 text-[#4A4A4A]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2 text-xs rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] text-[#1A1A1A] bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-60"
          >
            {loading ? 'Memproses Masuk...' : 'Masuk ke Sistem'}
          </button>
        </form>

        <div className="text-center text-xs text-[#4A4A4A]">
          Belum memiliki akun?{' '}
          <Link href="/register" className="text-[#0066FF] font-semibold hover:underline">
            Daftar di sini
          </Link>
        </div>

        {/* Akun Demo Cepat */}
        <div className="pt-4 border-t border-[#E5E7EB] space-y-2">
          <span className="text-[11px] font-semibold text-[#4A4A4A] uppercase tracking-wider block text-center">
            Pilih Akun Demo Pengujian
          </span>
          <div className="space-y-1.5 text-xs">
            <button
              type="button"
              onClick={() => setDemoUser('isya.asyhari@students.undip.ac.id')}
              className="w-full text-left p-2.5 rounded-[4px] border border-[#E5E7EB] hover:border-[#1A1A1A] hover:bg-[#F8F9FA] transition flex justify-between items-center"
            >
              <div>
                <span className="font-semibold text-[#1A1A1A] block">Muhammad Isya Asyhari</span>
                <span className="text-[11px] text-[#4A4A4A]">Mahasiswa (KTM: 01020304)</span>
              </div>
              <span className="font-mono text-[10px] uppercase text-[#0066FF] font-bold">[Mahasiswa]</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoUser('danang.setiawan@undip.ac.id')}
              className="w-full text-left p-2.5 rounded-[4px] border border-[#E5E7EB] hover:border-[#1A1A1A] hover:bg-[#F8F9FA] transition flex justify-between items-center"
            >
              <div>
                <span className="font-semibold text-[#1A1A1A] block">Dr. Ir. Danang Setiawan, M.T.</span>
                <span className="text-[11px] text-[#4A4A4A]">Dosen Pembimbing Lab</span>
              </div>
              <span className="font-mono text-[10px] uppercase text-[#16A34A] font-bold">[Dosen]</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoUser('aryo.wicaksono@undip.ac.id')}
              className="w-full text-left p-2.5 rounded-[4px] border border-[#E5E7EB] hover:border-[#1A1A1A] hover:bg-[#F8F9FA] transition flex justify-between items-center"
            >
              <div>
                <span className="font-semibold text-[#1A1A1A] block">Aryo Wicaksono, S.Kom.</span>
                <span className="text-[11px] text-[#4A4A4A]">Kepala Tata Usaha & Gate Admin</span>
              </div>
              <span className="font-mono text-[10px] uppercase text-[#DC2626] font-bold">[Admin/TU]</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
