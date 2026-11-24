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
      <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-6 sm:p-8 space-y-6">
        {/* Header dengan Logo */}
        <div className="text-center space-y-2">
          <img
            src="/logo-labgate.png"
            alt="Logo LabGate"
            className="w-14 h-14 object-contain mx-auto mb-2"
          />
          <h1 className="text-xl font-bold text-[#1A1A1A] tracking-tight">
            Pendaftaran Pengguna Baru
          </h1>
          <p className="text-xs text-[#4A4A4A]">
            Daftarkan identitas mahasiswa, dosen pembimbing, atau pengelola laboratorium
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-[4px] text-xs text-[#DC2626] flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-[#4A4A4A]" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Muhammad Isya Asyhari"
                required
                className="w-full pl-9 pr-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] text-[#1A1A1A] bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
              Email Kampus
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#4A4A4A]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@students.undip.ac.id"
                required
                className="w-full pl-9 pr-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] text-[#1A1A1A] bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                Peran / Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] text-[#1A1A1A] bg-white"
              >
                <option value="mahasiswa">Mahasiswa</option>
                <option value="dosen">Dosen Pembimbing</option>
                <option value="admin">Kepala TU / Admin Lab</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                NIM / NIP (Opsional)
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3 top-2.5 text-[#4A4A4A]" />
                <input
                  type="text"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  placeholder="21120121130001"
                  className="w-full pl-9 pr-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] text-[#1A1A1A] bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
              Departemen / Jurusan
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-[#4A4A4A]" />
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Teknik Komputer"
                required
                className="w-full pl-9 pr-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] text-[#1A1A1A] bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
              Password (Minimal 8 Karakter)
            </label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3 top-2.5 text-[#4A4A4A]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full pl-9 pr-3 py-2 rounded-[4px] border border-[#D1D5DB] focus:outline-none focus:border-[#0066FF] text-[#1A1A1A] bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-60"
          >
            {loading ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}
          </button>
        </form>

        <div className="text-center text-xs text-[#4A4A4A] pt-2 border-t border-[#E5E7EB]">
          Sudah memiliki akun?{' '}
          <Link href="/login" className="text-[#0066FF] font-semibold hover:underline">
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
