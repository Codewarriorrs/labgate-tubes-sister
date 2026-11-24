import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findUserByEmail, memoryStore, pool } from '@/lib/db';
import { hashPassword, signToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { User } from '@/types';

const registerSchema = z.object({
  name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  department: z.string().min(2, 'Jurusan/Departemen wajib diisi'),
  nim: z.string().optional(),
  role: z.enum(['mahasiswa', 'dosen', 'admin']).default('mahasiswa'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: parsed.error.errors[0]?.message || 'Input registrasi tidak valid',
          error: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, email, password, department, nim, role } = parsed.data;
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `Email ${email} sudah terdaftar di sistem LabGate`,
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name,
      email: email.toLowerCase(),
      role,
      department,
      nim: nim || null,
      createdAt: new Date().toISOString(),
    };

    if (pool) {
      try {
        await pool.query(
          `INSERT INTO users (id, name, email, password_hash, role, department, nim, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newUser.id, newUser.name, newUser.email, passwordHash, newUser.role, newUser.department, newUser.nim, newUser.createdAt]
        );
      } catch (err: any) {
        return NextResponse.json(
          { success: false, data: null, message: 'Gagal menyimpan user ke basis data', error: err.message },
          { status: 500 }
        );
      }
    } else {
      memoryStore.users.push(newUser);
      memoryStore.passwords[newUser.email] = passwordHash;
    }

    const token = await signToken({
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: newUser,
        message: 'Registrasi berhasil dan Anda telah masuk',
      },
      { status: 201 }
    );

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, data: null, message: 'Terjadi kesalahan internal server', error: error.message },
      { status: 500 }
    );
  }
}
