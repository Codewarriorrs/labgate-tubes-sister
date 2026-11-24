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
        width: 256,
        margin: 2,
        color: {
          dark: '#0f766e',
          light: '#ffffff',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border-2 border-[#bae6fd]">
        {/* Header Modal */}
        <div className="bg-[#0f766e] border-b-4 border-[#134e4a] px-5 py-4 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-white" />
            <h3 className="font-extrabold text-sm tracking-wide">Tiket Akses LabGate</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-teal-100 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-4">
          <div>
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 inline-block">
              Disetujui &bull; Tiket Terverifikasi
            </span>
            <h4 className="font-extrabold text-base text-[#3c3c3c] mt-2.5">
              {booking.userName}
            </h4>
            <p className="text-[11px] text-[#777777] font-medium">ID: {booking.id}</p>
          </div>

          {/* QR Code Canvas */}
          <div className="flex justify-center p-3 bg-[#ddf4ff]/50 rounded-2xl border-2 border-[#bae6fd]">
            {booking.qrToken ? (
              <canvas ref={canvasRef} className="rounded-xl shadow-sm" />
            ) : (
              <div className="p-8 text-[#777777] text-xs">Tiket QR tidak tersedia</div>
            )}
          </div>

          {/* Detail Informasi */}
          <div className="bg-[#f8fafc] rounded-xl p-3.5 text-left text-xs space-y-2 border border-slate-200">
            <div className="flex items-start space-x-2 text-[#3c3c3c]">
              <MapPin className="w-4 h-4 text-[#0f766e] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">{booking.roomName || booking.roomId}</span>
                <span className="text-[#777777] text-[11px]">Kode Gate: {booking.roomCode || booking.roomId}</span>
              </div>
            </div>

            <div className="flex items-start space-x-2 text-[#3c3c3c]">
              <Clock className="w-4 h-4 text-[#0f766e] shrink-0 mt-0.5" />
              <div>
                <span className="font-medium block">{dateStr}</span>
                <span className="font-extrabold text-[#0f766e]">{startStr} - {endStr} WIB</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-teal-900 bg-teal-50 p-2.5 rounded-xl border border-teal-200">
            <ShieldCheck className="w-4 h-4 text-[#0f766e] shrink-0" />
            <span className="font-bold">Tanda tangan Ed25519 &bull; Valid offline</span>
          </div>

          <button
            onClick={onClose}
            className="w-full btn-secondary py-2.5 text-xs font-bold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
