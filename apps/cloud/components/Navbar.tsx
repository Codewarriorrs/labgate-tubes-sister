'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DoorClosed,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  History,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { User } from '@/types';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const isDosen = user?.role === 'dosen';
  const isAdmin = user?.role === 'admin';

  // Catatan: Sesuai instruksi, API Docs tidak dibuatin button di navbar utama
  const navItems = [
    { label: 'Booking Lab', href: '/dashboard', icon: CalendarCheck, show: true },
    { label: 'Approval', href: '/approval', icon: ClipboardList, show: isDosen || isAdmin },
    { label: 'Ruangan & Gate', href: '/rooms', icon: DoorClosed, show: isAdmin },
    { label: 'Kartu KTM', href: '/cards', icon: CreditCard, show: isAdmin },
    { label: 'Log Akses', href: '/logs', icon: History, show: isDosen || isAdmin },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Kampus Title */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5">
              <img
                src="/logo-labgate.png"
                alt="LabGate Logo"
                className="w-8 h-8 object-contain"
              />
              <div>
                <span className="font-bold text-base text-[#1A1A1A] tracking-tight block leading-tight">
                  LabGate
                </span>
                <span className="text-[11px] text-[#4A4A4A] block">
                  Integrated Laboratory Access
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {user ? (
            <nav className="hidden md:flex items-center space-x-1">
              {navItems
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors ${
                        isActive
                          ? 'bg-[#1A1A1A] text-white'
                          : 'text-[#4A4A4A] hover:text-[#1A1A1A] hover:bg-[#F3F4F6]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 mr-1.5" />
                      {item.label}
                    </Link>
                  );
                })}
            </nav>
          ) : (
            <nav className="hidden md:flex items-center space-x-2">
              <Link
                href="/"
                className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-colors ${
                  pathname === '/' ? 'text-[#0066FF]' : 'text-[#4A4A4A] hover:text-[#1A1A1A]'
                }`}
              >
                Beranda
              </Link>
            </nav>
          )}

          {/* User Info & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <span className="text-xs font-bold text-[#1A1A1A] block leading-tight">
                    {user.name}
                  </span>
                  <div className="flex items-center justify-end space-x-1.5 mt-0.5 text-[11px] text-[#4A4A4A]">
                    <span className="font-mono uppercase font-semibold text-[#0066FF]">
                      [{user.role}]
                    </span>
                    <span>&bull;</span>
                    <span>{user.department}</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Keluar"
                  className="p-1.5 text-[#4A4A4A] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-[4px] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="btn-secondary px-3.5 py-1.5 text-xs"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="btn-primary px-3.5 py-1.5 text-xs"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Submenu Bar */}
      {user && (
        <div className="md:hidden border-t border-[#E5E7EB] px-2 py-1.5 flex overflow-x-auto space-x-1 bg-[#F8F9FA]">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold whitespace-nowrap rounded-[4px] transition-colors ${
                    isActive
                      ? 'bg-[#1A1A1A] text-white'
                      : 'text-[#4A4A4A] hover:bg-[#E5E7EB]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 mr-1" />
                  {item.label}
                </Link>
              );
            })}
        </div>
      )}
    </header>
  );
}
