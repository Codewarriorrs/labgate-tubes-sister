'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, User, Mail, Key, Building2, Hash, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Teknik Komputer');
  const [nim, setNim] = useState('');
  const [role, setRole] = useState<'mahasiswa' | 'dosen' | 'admin'>('mahasiswa');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          department,
          nim: nim || undefined,
          role,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.message || 'Pendaftaran gagal. Periksa kembali isian formulir.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setErrorMsg('Gagal terhubung ke server cloud.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto my-6 sm:my-10">
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-10 space-y-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        {/* Header dengan Logo */}
        <div className="text-center space-y-2">
          <img
            src="/logo-labgate.png"
            alt="Logo LabGate"
            className="w-20 h-20 object-contain mx-auto mb-2"
          />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Registrasi Pengguna Baru
          </h1>
          <p className="text-xs text-slate-500">
            Daftarkan identitas mahasiswa, dosen pembimbing, atau pengelola laboratorium
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1.5 text-xs">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Muhammad Isya Asyhari"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 text-slate-900 bg-white text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1.5 text-xs">
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 text-slate-900 bg-white text-sm transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-medium text-slate-700 mb-1.5 text-xs">
                Peran / Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 text-slate-900 bg-white text-sm transition"
              >
                <option value="mahasiswa">Mahasiswa</option>
                <option value="dosen">Dosen Pembimbing</option>
                <option value="admin">Kepala TU / Admin Lab</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1.5 text-xs">
                NIM / NIP (Opsional)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  placeholder="21120124130051"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 text-slate-900 bg-white text-sm transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1.5 text-xs">
              Departemen / Jurusan
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Teknik Komputer"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 text-slate-900 bg-white text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1.5 text-xs">
              Password (Minimal 8 Karakter)
            </label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#2A85FF] focus:ring-2 focus:ring-[#2A85FF]/10 text-slate-900 bg-white text-sm transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F172A] hover:bg-black text-white font-semibold rounded-full py-3 text-sm shadow-sm transition-all duration-150 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span>{loading ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Sudah memiliki akun?{' '}
          <Link href="/login" className="text-[#2A85FF] font-semibold hover:underline">
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
