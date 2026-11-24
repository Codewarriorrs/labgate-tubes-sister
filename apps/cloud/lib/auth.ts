import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { JWTPayload, UserRole } from '@/types';

export const AUTH_COOKIE_NAME = 'labgate_token';
const JWT_SECRET_STRING =
  process.env.JWT_SECRET || 'labgate-secret-key-undip-semarang-min-32-chars-long';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new jose.SignJWT({
    userId: payload.userId,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    department: payload.department,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as UserRole,
      department: payload.department as string,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(request?: NextRequest): Promise<JWTPayload | null> {
  let token: string | undefined;

  if (request) {
    const cookieHeader = request.cookies.get(AUTH_COOKIE_NAME);
    token = cookieHeader?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    } catch {
      // Diluar context request Next.js
    }
  }

  if (!token) return null;
  return verifyToken(token);
}
