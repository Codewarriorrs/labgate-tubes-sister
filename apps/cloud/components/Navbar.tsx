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
  FileCode,
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

  const isMahasiswa = user?.role === 'mahasiswa';
  const isDosen = user?.role === 'dosen';
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { label: 'Booking Lab', href: '/dashboard', icon: CalendarCheck, show: true },
    { label: 'Approval', href: '/approval', icon: ClipboardList, show: isDosen || isAdmin },
    { label: 'Ruangan & Gate', href: '/rooms', icon: DoorClosed, show: isAdmin },
    { label: 'Kartu KTM', href: '/cards', icon: CreditCard, show: isAdmin },
    { label: 'Log Akses', href: '/logs', icon: History, show: isDosen || isAdmin },
    { label: 'API Docs', href: '/api-docs', icon: FileCode, show: true },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b-2 border-[#bae6fd] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Kampus Title */}
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#0f766e] border-b-4 border-[#134e4a] flex items-center justify-center text-white font-extrabold text-lg shadow-sm transition-transform group-hover:scale-105">
                LG
              </div>
              <div>
                <span className="font-extrabold text-lg text-[#3c3c3c] tracking-tight block leading-tight">
                  LabGate
                </span>
                <span className="text-[11px] text-[#777777] font-bold block">
                  Akses Lab Terintegrasi
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1.5">
              {navItems
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                        isActive
                          ? 'bg-[#0f766e] text-white border-b-4 border-[#134e4a]'
                          : 'text-[#3c3c3c] hover:bg-[#ddf4ff] hover:text-[#0f766e]'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {item.label}
                    </Link>
                  );
                })}
            </nav>
          )}

          {/* User Info & Actions */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <span className="text-xs font-bold text-[#3c3c3c] block leading-tight">
                    {user.name}
                  </span>
                  <div className="flex items-center justify-end space-x-1.5 mt-0.5">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-lg uppercase ${
                        user.role === 'admin'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : user.role === 'dosen'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-[#ddf4ff] text-[#0f766e] border border-[#bae6fd]'
                      }`}
                    >
                      {user.role}
                    </span>
                    <span className="text-[11px] text-[#777777] font-medium">{user.department}</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Keluar"
                  className="p-2 text-[#777777] hover:text-[#ef4444] hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="btn-primary px-4 py-2 text-xs font-bold"
              >
                <UserIcon className="w-4 h-4 mr-1.5" />
                Masuk
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Submenu Bar */}
      {user && (
        <div className="md:hidden border-t border-[#bae6fd] px-2 py-2 flex overflow-x-auto space-x-1.5 bg-[#f0f9ff]">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#0f766e] text-white border-b-2 border-[#134e4a]'
                      : 'text-[#3c3c3c] hover:bg-[#ddf4ff]'
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
