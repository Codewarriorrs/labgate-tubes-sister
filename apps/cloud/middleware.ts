import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

export const AUTH_COOKIE_NAME = 'labgate_token';
const JWT_SECRET_STRING =
  process.env.JWT_SECRET || 'labgate-secret-key-undip-semarang-min-32-chars-long';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

// Rute yang memerlukan autentikasi login
const protectedRoutes = ['/dashboard', '/approval', '/rooms', '/cards', '/logs'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    const role = (payload.role as string)?.toLowerCase();

    // Proteksi berbasis peran (Role-Based Access Control)
    // 1. /approval: Hanya Dosen Pembimbing dan Admin (Kepala TU)
    if (pathname.startsWith('/approval') && role !== 'dosen' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 2. /rooms dan /cards: Khusus Kepala TU / Admin Laboratorium
    if ((pathname.startsWith('/rooms') || pathname.startsWith('/cards')) && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 3. /logs: Hanya Dosen dan Admin (Kepala TU)
    if (pathname.startsWith('/logs') && role !== 'dosen' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/approval/:path*',
    '/rooms/:path*',
    '/cards/:path*',
    '/logs/:path*',
  ],
};
