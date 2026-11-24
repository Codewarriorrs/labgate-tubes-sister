import React from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { ShieldCheck, QrCode, Cpu, WifiOff, ArrowRight, Key, Layers, CheckCircle2 } from 'lucide-react';

export default async function HomePage() {
  const session = await getCurrentUser();

  return (
    <div className="space-y-12 py-4 sm:py-8">
      {/* Hero Section */}
      <section className="bg-white border border-[#E5E7EB] rounded-[4px] p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center space-x-2 text-xs font-semibold text-[#0066FF] uppercase tracking-wider">
            <span>Sistem Terintegrasi Dual-Service</span>
            <span>&bull;</span>
            <span>Offline-First Resilience</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] tracking-tight leading-tight">
            Gerbang Akses Laboratorium Terintegrasi & Mandiri
          </h1>
          <p className="text-[#4A4A4A] text-sm sm:text-base leading-relaxed">
            Platform peminjaman ruangan dan alat laboratorium untuk mahasiswa, antrean persetujuan dosen/admin, serta gate scanner lokal yang tetap memvalidasi akses secara kriptografis saat koneksi internet kampus padam.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {session ? (
              <Link
                href="/dashboard"
                className="btn-accent px-5 py-2.5 text-sm inline-flex items-center space-x-2"
              >
                <span>Buka Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-primary px-5 py-2.5 text-sm inline-flex items-center space-x-2"
                >
                  <span>Masuk Akun</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/register"
                  className="btn-secondary px-5 py-2.5 text-sm"
                >
                  Pendaftaran Baru
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="w-48 sm:w-64 shrink-0 flex flex-col items-center justify-center p-6 bg-[#F8F9FA] border border-[#E5E7EB] rounded-[4px]">
          <img
            src="/logo-labgate.png"
            alt="Logo LabGate"
            className="w-36 h-36 object-contain mb-3"
          />
          <span className="font-bold text-sm text-[#1A1A1A]">LabGate v1.0</span>
          <span className="text-xs text-[#4A4A4A]">Teknik Komputer Tembalang</span>
        </div>
      </section>

      {/* 3 Pilar Arsitektur Flat Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-6 space-y-3">
          <div className="w-10 h-10 rounded-[4px] bg-[#1A1A1A] flex items-center justify-center text-white font-bold">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-[#1A1A1A]">Cloud Service (Next.js)</h2>
          <p className="text-xs text-[#4A4A4A] leading-relaxed">
            Portal web mahasiswa dan dosen untuk permohonan jadwal, pencegahan bentrok otomatis, dan penerbitan tiket QR ber-tanda tangan kriptografi Ed25519.
          </p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-6 space-y-3">
          <div className="w-10 h-10 rounded-[4px] bg-[#0066FF] flex items-center justify-center text-white font-bold">
            <WifiOff className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-[#1A1A1A]">Edge Gateway (Port 4000)</h2>
          <p className="text-xs text-[#4A4A4A] leading-relaxed">
            Service lokal berbasis SQLite dan kamera webcam di depan pintu lab. Memvalidasi tiket QR dan kartu RFID seketika tanpa memerlukan koneksi cloud aktif.
          </p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-[4px] p-6 space-y-3">
          <div className="w-10 h-10 rounded-[4px] bg-[#4A4A4A] flex items-center justify-center text-white font-bold">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-[#1A1A1A]">ESP32 Periferal</h2>
          <p className="text-xs text-[#4A4A4A] leading-relaxed">
            Perangkat mikrokontroler solenoid dan RFID yang terhubung ke Gateway melalui protokol MQTT, dilengkapi layar LCD 16x2 dan indikator status pintu.
          </p>
        </div>
      </section>

      {/* Ringkasan Fitur Unggulan */}
      <section className="bg-white border border-[#E5E7EB] rounded-[4px] p-6 sm:p-8 space-y-6">
        <h2 className="text-lg font-bold text-[#1A1A1A] border-b border-[#E5E7EB] pb-3">
          Spesifikasi Teknis & Kepatuhan Sistem
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#4A4A4A]">
          <div className="flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#1A1A1A] block">Komunikasi Antar-Service Lengkap</strong>
              <span>Menggunakan metode HTTP REST: GET, POST, PUT, dan DELETE pada sinkronisasi gateway ke cloud.</span>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#1A1A1A] block">Keamanan Kriptografi Asimetris</strong>
              <span>Tiket QR diverifikasi menggunakan public key Ed25519; UID kartu KTM disimpan sebagai Hash SHA-256 + Pepper.</span>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#1A1A1A] block">Toleransi Waktu Akses Pintu</strong>
              <span>Jendela kedatangan otomatis: 10 menit sebelum jam mulai hingga 5 menit setelah jam selesai.</span>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#1A1A1A] block">Mekanisme Darurat & Remote Unlock</strong>
              <span>Dilengkapi PIN darurat petugas (1722) dan tombol buka pintu jarak jauh dari antarmuka web.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
