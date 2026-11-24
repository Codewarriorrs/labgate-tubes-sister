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
      <body className="min-h-[100dvh] flex flex-col bg-[#F8F9FA] text-[#1A1A1A] antialiased">
        <Navbar user={user} />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="bg-white border-t border-[#E5E7EB] py-4 text-center text-xs text-[#4A4A4A]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <img src="/logo-labgate.png" alt="LabGate Logo" className="w-5 h-5 object-contain" />
              <span className="font-semibold text-[#1A1A1A]">LabGate</span>
              <span>&bull; Tugas Besar Sistem Terintegrasi</span>
            </div>
            <span className="text-[11px] text-[#4A4A4A]">Fakultas Teknik &bull; Kampus Tembalang, Semarang</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
