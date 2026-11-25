'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DoorClosed,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  History,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { User } from '@/types';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navItems = [
    { label: 'Booking Lab', href: '/dashboard', icon: CalendarCheck, show: true },
    { label: 'Approval', href: '/approval', icon: ClipboardList, show: isDosen || isAdmin },
    { label: 'Ruangan & Gate', href: '/rooms', icon: DoorClosed, show: isAdmin },
    { label: 'Kartu KTM', href: '/cards', icon: CreditCard, show: isAdmin },
    { label: 'Log Akses', href: '/logs', icon: History, show: isDosen || isAdmin },
  ];

  const visibleNavItems = navItems.filter((item) => item.show);

  const getRoleBadgeLabel = (role: string) => {
    switch (role.toLowerCase()) {
      case 'dosen':
        return 'DOSEN';
      case 'admin':
        return 'KEPALA TU';
      case 'mahasiswa':
        return 'MAHASISWA';
      default:
        return role.toUpperCase();
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role.toLowerCase()) {
      case 'dosen':
        return 'bg-blue-50 text-[#2A85FF] border border-blue-200/60';
      case 'admin':
        return 'bg-purple-50 text-purple-700 border border-purple-200/60';
      case 'mahasiswa':
        return 'bg-slate-100 text-slate-700 border border-slate-200/60';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200/60';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo LabGate di Kiri */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 group"
            >
              <img
                src="/logo-labgate.png"
                alt="LabGate Logo"
                className="w-10 h-10 object-contain transition-transform group-hover:scale-105"
              />
              <div>
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight block leading-tight">
                  LabGate
                </span>
                <span className="text-[11px] font-medium text-slate-500 block">
                  Integrated Laboratory Access
                </span>
              </div>
            </Link>
          </div>

          {/* Tab Menu di Tengah (Desktop) - DentCare Pill Tabs */}
          {user ? (
            <nav className="hidden md:flex items-center space-x-1.5 bg-slate-50/80 p-1.5 rounded-full border border-slate-100">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all ${
                      isActive
                        ? 'bg-[#2A85FF] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <nav className="hidden md:flex items-center space-x-2">
              <Link
                href="/"
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                  pathname === '/' ? 'text-[#2A85FF] bg-blue-50' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Beranda
              </Link>
            </nav>
          )}

          {/* Profil User & Logout di Kanan */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <span className="text-sm font-bold text-slate-900">
                      {user.name}
                    </span>
                    {/* Sleek Badge untuk Role */}
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md uppercase tracking-wide ${getRoleBadgeStyle(user.role)}`}>
                      {getRoleBadgeLabel(user.role)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    {user.department}
                  </span>
                </div>

                {/* Logout Button dengan Icon Merah */}
                <button
                  onClick={handleLogout}
                  title="Keluar dari akun"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="btn-pill-secondary px-5 py-2 text-xs"
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

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center space-x-2">
            {user && (
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md uppercase ${getRoleBadgeStyle(user.role)}`}>
                {getRoleBadgeLabel(user.role)}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-full transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg rounded-b-3xl">
          {user && (
            <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-slate-900 block">{user.name}</span>
                <span className="text-xs text-slate-500">{user.department}</span>
              </div>
              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md uppercase ${getRoleBadgeStyle(user.role)}`}>
                {getRoleBadgeLabel(user.role)}
              </span>
            </div>
          )}

          <nav className="flex flex-col space-y-1">
            {user ? (
              visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-2.5 text-sm font-semibold rounded-full transition ${
                      isActive
                        ? 'bg-[#2A85FF] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })
            ) : (
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-full"
              >
                Beranda
              </Link>
            )}
          </nav>

          {user ? (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-full transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun</span>
            </button>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-pill-secondary flex-1 text-center py-2.5 text-xs"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-pill-primary flex-1 text-center py-2.5 text-xs"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
