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
  User as UserIcon,
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

  // API Docs diakses langsung via link /api-docs tanpa tombol navbar utama
  const navItems = [
    { label: 'Booking Lab', href: '/dashboard', icon: CalendarCheck, show: true },
    { label: 'Approval', href: '/approval', icon: ClipboardList, show: isDosen || isAdmin },
    { label: 'Ruangan & Gate', href: '/rooms', icon: DoorClosed, show: isAdmin },
    { label: 'Kartu KTM', href: '/cards', icon: CreditCard, show: isAdmin },
    { label: 'Log Akses', href: '/logs', icon: History, show: isDosen || isAdmin },
  ];

  const visibleNavItems = navItems.filter((item) => item.show);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Kampus Title */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2.5"
            >
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
              {visibleNavItems.map((item) => {
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

          {/* Desktop User Info & Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right">
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
                  className="p-1.5 text-[#4A4A4A] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-[4px] transition-colors active:translate-y-[1px]"
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

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center space-x-2">
            {user && (
              <span className="text-[10px] font-mono uppercase font-bold text-[#0066FF] bg-[#F8F9FA] px-2 py-0.5 border border-[#E5E7EB] rounded-[2px]">
                {user.role}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="p-2 rounded-[4px] border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F4F6] transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Stacked Navigation Drawer (Zero Horizontal Scroll) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E7EB] bg-white px-4 py-3 space-y-3">
          {user ? (
            <>
              {/* User Identity Banner */}
              <div className="p-3 bg-[#F8F9FA] border border-[#E5E7EB] rounded-[4px] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#1A1A1A] block">
                    {user.name}
                  </span>
                  <span className="text-[11px] text-[#4A4A4A]">
                    {user.department} &bull; <strong className="text-[#0066FF] uppercase">[{user.role}]</strong>
                  </span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-xs text-[#DC2626] hover:bg-[#FEE2E2] px-2.5 py-1 rounded-[4px] border border-[#FCA5A5] flex items-center space-x-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>

              {/* Vertical Stacked Navigation Links */}
              <div className="flex flex-col space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-[4px] transition ${
                        isActive
                          ? 'bg-[#1A1A1A] text-white'
                          : 'text-[#1A1A1A] hover:bg-[#F3F4F6] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <span className="text-[10px] font-mono tracking-wider">[AKTIF]</span>}
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
                className="px-3 py-2 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F3F4F6] rounded-[4px]"
              >
                Beranda
              </Link>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E7EB]">
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
