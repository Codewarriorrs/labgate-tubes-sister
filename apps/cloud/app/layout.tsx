import './globals.css';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { findUserById } from '@/lib/db';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'LabGate - Integrated Laboratory Gate Access',
  description: 'Sistem booking laboratorium, approval bertingkat, dan gate access offline terintegrasi',
  icons: {
    icon: '/logo-labgate.png',
    apple: '/logo-labgate.png',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  const user = session ? await findUserById(session.userId) : null;

  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/logo-labgate.png" type="image/png" />
      </head>
      <body className="min-h-[100dvh] flex flex-col bg-[#F8FAFC] text-slate-900 antialiased font-sans">
        <Navbar user={user} />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <img src="/logo-labgate.png" alt="LabGate Logo" className="w-7 h-7 object-contain" />
              <span className="font-bold text-slate-900 text-sm">LabGate</span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-slate-500">Sistem Reservasi & Kontrol Akses Offline-First Laboratorium</span>
            </div>
            <span className="text-[11px] text-slate-400">Fakultas Teknik &bull; Kampus Tembalang, Semarang</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
