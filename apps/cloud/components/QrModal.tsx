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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white border border-[#E5E7EB] rounded-[4px] max-w-sm w-full overflow-hidden">
        {/* Header Modal */}
        <div className="bg-[#1A1A1A] px-4 py-3 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <QrCode className="w-4 h-4 text-white" />
            <h3 className="font-semibold text-xs tracking-wider uppercase">Tiket Akses LabGate</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 text-center space-y-4 text-xs">
          <div>
            <span className="font-mono text-[10px] uppercase font-bold text-[#16A34A] block">
              [Status: Disetujui / Terverifikasi]
            </span>
            <h4 className="font-bold text-base text-[#1A1A1A] mt-1">
              {booking.userName}
            </h4>
            <p className="text-[11px] text-[#4A4A4A] font-mono">ID: {booking.id}</p>
          </div>

          {/* QR Code Canvas */}
          <div className="flex justify-center p-3 bg-white border border-[#E5E7EB] rounded-[2px]">
            {booking.qrToken ? (
              <canvas ref={canvasRef} />
            ) : (
              <div className="p-8 text-[#4A4A4A] text-xs">Tiket QR tidak tersedia</div>
            )}
          </div>

          {/* Detail Informasi */}
          <div className="bg-[#F8F9FA] rounded-[2px] p-3 text-left space-y-1.5 border border-[#E5E7EB]">
            <div className="flex items-start space-x-2 text-[#1A1A1A]">
              <MapPin className="w-3.5 h-3.5 text-[#0066FF] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">{booking.roomName || booking.roomId}</span>
                <span className="text-[#4A4A4A] text-[11px]">Kode Gate: {booking.roomCode || booking.roomId}</span>
              </div>
            </div>

            <div className="flex items-start space-x-2 text-[#1A1A1A]">
              <Clock className="w-3.5 h-3.5 text-[#0066FF] shrink-0 mt-0.5" />
              <div>
                <span className="block text-[#4A4A4A]">{dateStr}</span>
                <span className="font-semibold">{startStr} - {endStr} WIB</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-[#4A4A4A] border-t border-[#E5E7EB] pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
            <span>Tanda tangan Ed25519 &bull; Valid offline</span>
          </div>

          <button
            onClick={onClose}
            className="w-full btn-secondary py-2 text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
