import React from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import {
  Calendar,
  ArrowRight,
  Layers,
  Cpu,
  WifiOff,
  CheckCircle2,
  Clock,
  DoorOpen,
} from 'lucide-react';

export default async function HomePage() {
  const session = await getCurrentUser();

  return (
    <div className="space-y-12 sm:space-y-16 py-4 sm:py-6">
      {/* Hero Section: DentCare Style Electric Blue Banner */}
      <section className="bg-gradient-to-br from-[#2A85FF] via-[#1E74E8] to-[#165EC4] rounded-3xl p-8 sm:p-14 text-white shadow-xl relative overflow-hidden">
        {/* Decorative background glow circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-400/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-100 block">
              Peminjaman Fasilitas Laboratorium
            </span>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.15]">
              Sederhanakan Reservasi, Akses Lab Cepat & Presisi
            </h1>

            <p className="text-blue-50 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              Platform reservasi peminjaman ruang dan peralatan laboratorium praktikum, pencegahan bentrok jadwal otomatis, serta kemudahan akses pintu laboratorium.
            </p>

            {/* Floating Action Pill */}
            <div className="pt-2">
              <div className="bg-white rounded-full p-2 pl-5 sm:pl-6 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-slate-800 max-w-lg">
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <Calendar className="w-4 h-4 text-[#2A85FF]" />
                  <span className="font-medium">
                    {session ? `Masuk sebagai ${session.name}` : 'Pilih Lab & Waktu Peminjaman'}
                  </span>
                </div>

                {session ? (
                  <Link
                    href="/dashboard"
                    className="btn-pill-primary px-6 py-2.5 text-xs text-center flex items-center justify-center space-x-1.5"
                  >
                    <span>Peminjaman Lab</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link
                      href="/login"
                      className="btn-pill-secondary px-4 py-2 text-xs"
                    >
                      Masuk
                    </Link>
                    <Link
                      href="/register"
                      className="btn-pill-primary px-5 py-2 text-xs"
                    >
                      Daftar
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Hero Visual Card - Solid Crisp White for High Logo Contrast */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="bg-white rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center shadow-2xl w-full max-w-xs border border-white/80 transition-transform hover:scale-[1.02]">
              <div className="w-36 h-36 sm:w-40 sm:h-40 p-2 flex items-center justify-center mb-3">
                <img
                  src="/logo-labgate.png"
                  alt="Logo LabGate"
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
              <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">LabGate</h2>
              <span className="text-xs font-semibold text-[#2A85FF] mt-0.5">Integrated Laboratory Access</span>
              <span className="text-[11px] text-slate-500 mt-1">Fakultas Teknik Universitas Diponegoro</span>
              <span className="text-[11px] font-medium text-slate-400 mt-3 block">
                Tembalang, Semarang
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Kategori Laboratorium */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Kategori Ruang Laboratorium
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pilih ruangan laboratorium untuk praktikum, riset proyek akhir, atau kegiatan akademik.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2A85FF] flex items-center justify-center mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-[#2A85FF] uppercase tracking-wider block mb-1">
                KODE: LAB-01
              </span>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                Lab Rekayasa Perangkat Lunak & Sistem Terintegrasi
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Gedung D Lt. 3. Dilengkapi workstation pengembangan software, IoT gateway scanner, dan RFID reader.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Kapasitas: 35 Praktikan</span>
              <span className="inline-flex items-center text-emerald-600 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                Tersedia
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
                KODE: LAB-02
              </span>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                Lab Sistem Tertanam & Robotika
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Gedung E Lt. 2. Workstation mikrokontroler ESP32, STM32, dan Oscilloscope Digital Rigol DS1054Z.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Kapasitas: 25 Praktikan</span>
              <span className="inline-flex items-center text-emerald-600 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                Tersedia
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <WifiOff className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block mb-1">
                KODE: LAB-03
              </span>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                Lab Jaringan Komputer & Keamanan Siber
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Gedung D Lt. 2. Rack server blade, switch Cisco Catalyst, dan lingkungan isolasi jaringan.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Kapasitas: 30 Praktikan</span>
              <span className="inline-flex items-center text-emerald-600 font-semibold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                Tersedia
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Alur Sederhana Peminjaman Lab */}
      <section className="bg-white border border-slate-100 rounded-3xl p-8 sm:p-12 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-8">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Alur Peminjaman Laboratorium
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Proses peminjaman ruangan dan alat laboratorium praktikum.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-[#2A85FF] flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-base">Ajukan Jadwal</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pilih ruang lab, jam praktikum antara 06.00 – 19.00 WIB, dan alat tambahan yang ingin dipinjam.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-base">Persetujuan Dosen</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dosen pembimbing atau pengelola lab memverifikasi permohonan peminjaman di sistem.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-base">Akses Ruangan</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Gunakan tiket QR yang diterbitkan atau tempelkan kartu KTM RFID saat waktu peminjaman tiba.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
