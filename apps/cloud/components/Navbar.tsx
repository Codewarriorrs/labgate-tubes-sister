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
        return 'Dosen';
      case 'admin':
        return 'Kepala TU / Admin';
      case 'mahasiswa':
        return 'Mahasiswa';
      default:
        return role;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & App Title di Kiri */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2.5 group"
            >
              <img
                src="/logo-labgate.png"
                alt="LabGate Logo"
                className="w-8 h-8 object-contain transition-transform group-hover:scale-105"
              />
              <div>
                <span className="font-bold text-base text-slate-900 tracking-tight block leading-tight">
                  LabGate
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Integrated Laboratory Access
                </span>
              </div>
            </Link>
          </div>

          {/* Tab Menu di Tengah (Desktop) */}
          {user ? (
            <nav className="hidden md:flex items-center space-x-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname === '/' ? 'text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
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
                    <span className="text-sm font-semibold text-slate-900">
                      {user.name}
                    </span>
                    {/* Modern Soft Pill Badge untuk Role */}
                    <span className="bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 text-xs font-medium border border-blue-200/60">
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
                  className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors active:translate-y-[1px]"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="btn-primary px-4 py-2 text-xs"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center space-x-2">
            {user && (
              <span className="bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 text-xs font-medium border border-blue-200">
                {getRoleBadgeLabel(user.role)}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Zero Horizontal Scroll) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-3">
          {user ? (
            <>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">
                    {user.name}
                  </span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-[11px] font-medium border border-blue-200">
                      {getRoleBadgeLabel(user.role)}
                    </span>
                    <span className="text-xs text-slate-500">&bull; {user.department}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-xs text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 flex items-center space-x-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>

              <div className="flex flex-col space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <span className="text-xs font-mono">[Aktif]</span>}
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col space-y-2 py-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Beranda
              </Link>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-secondary py-2 text-xs text-center"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary py-2 text-xs text-center"
                >
                  Daftar
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
