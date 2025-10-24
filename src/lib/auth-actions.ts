
'use server';

import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';
import { initializeServerSideFirebase } from '@/firebase/server-init-admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

// These environment variables should be set in your hosting environment's secrets,
// not hardcoded. For local development, you can use a .env.local file.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "hello@pathsynch.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "GetRich@24K";


export async function login(prevState: any, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { success: false, message: 'Invalid email or password format.' };
  }

  const { email, password } = parsed.data;

  // Hardcoded credentials check
  if (
    email !== ADMIN_EMAIL ||
    password !== ADMIN_PASSWORD
  ) {
    return { success: false, message: 'Invalid credentials.' };
  }

  try {
    const adminApp = initializeServerSideFirebase();
    const adminAuth = getAuth(adminApp);
    // We get the user record to ensure the user exists in Firebase Auth.
    // This will fail if the user is not found, which is intended.
    const userRecord = await adminAuth.getUserByEmail(email);

    // Create a session cookie.
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(userRecord.uid, {
      expiresIn,
    });

    cookies().set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'lax',
    });
  } catch (error) {
    if ((error as any).code === 'auth/user-not-found') {
      // To create the admin user, it must first be created in the Firebase Console's Authentication tab.
      // Then, for local dev, you can use the same credentials.
      return {
        success: false,
        message: 'Admin user does not exist in Firebase. Please create it first in the Firebase Console.',
      };
    }
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message };
  }

  revalidatePath('/admin');
  redirect('/admin');
}

export async function logout() {
  cookies().delete('session');
  revalidatePath('/');
  redirect('/');
}
