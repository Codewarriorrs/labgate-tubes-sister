import './globals.css';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { findUserById } from '@/lib/db';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'LabGate - Sistem Akses Lab Terintegrasi',
  description: 'Sistem booking laboratorium, approval bertingkat, dan gate access offline terintegrasi',
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
      <body className="min-h-[100dvh] flex flex-col bg-[#ddf4ff] text-[#3c3c3c] antialiased">
        <Navbar user={user} />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="bg-white border-t-2 border-[#bae6fd] py-4 text-center text-xs text-[#777777] font-medium">
          <p>&copy; {new Date().getFullYear()} LabGate &bull; Sistem Terintegrasi &bull; Kampus Tembalang, Semarang</p>
        </footer>
      </body>
    </html>
  );
}
