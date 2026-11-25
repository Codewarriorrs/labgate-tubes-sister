'use client';

import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, ShieldCheck, Clock, MapPin } from 'lucide-react';
import { Booking } from '@/types';

interface QrModalProps {
  booking: Booking | null;
  onClose: () => void;
}

export default function QrModal({ booking, onClose }: QrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (booking?.qrToken && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, booking.qrToken, {
        width: 240,
        margin: 1,
        color: {
          dark: '#1A1A1A',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      }).catch((err) => {
        console.error('Gagal generate QR canvas:', err);
      });
    }
  }, [booking?.qrToken]);

  if (!booking) return null;

  const startStr = new Date(booking.startTime).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endStr = new Date(booking.endTime).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = new Date(booking.startTime).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-100 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl">
        {/* Header Modal */}
        <div className="bg-[#0F172A] px-5 py-4 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-[#2A85FF] flex items-center justify-center text-white">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Tiket Akses LabGate</h3>
              <p className="text-[10px] text-slate-400 font-mono">#{booking.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-4 text-xs">
          <div>
            <span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold px-3 py-1 rounded-full text-xs">
              Terverifikasi & Disetujui
            </span>
            <h4 className="font-bold text-lg text-slate-900 mt-2">
              {booking.userName}
            </h4>
          </div>

          {/* QR Code Canvas */}
          <div className="flex justify-center p-4 bg-white border border-slate-100 rounded-2xl shadow-xs">
            {booking.qrToken ? (
              <canvas ref={canvasRef} className="rounded-lg" />
            ) : (
              <div className="p-8 text-slate-400 text-xs">Tiket QR tidak tersedia</div>
            )}
          </div>

          {/* Detail Informasi (DentCare Soft Card Style) */}
          <div className="bg-[#EAF4FF] rounded-2xl p-4 text-left space-y-2 border border-blue-100/60">
            <div className="flex items-start space-x-2.5 text-slate-900">
              <MapPin className="w-4 h-4 text-[#2A85FF] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">{booking.roomName || booking.roomId}</span>
                <span className="text-slate-500 text-[11px]">Kode Gate: {booking.roomCode || booking.roomId}</span>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 text-slate-900">
              <Clock className="w-4 h-4 text-[#2A85FF] shrink-0 mt-0.5" />
              <div>
                <span className="block text-slate-600">{dateStr}</span>
                <span className="font-semibold text-slate-900">{startStr} - {endStr} WIB</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tanda tangan Ed25519 &bull; Valid offline</span>
          </div>

          <button
            onClick={onClose}
            className="w-full btn-pill-primary py-2.5 text-xs font-semibold shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
