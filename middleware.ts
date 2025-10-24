
import { NextResponse, type NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeServerSideFirebase } from '@/firebase/server-init-admin';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin_Hampton_Inn_2027 routes
  if (pathname.startsWith('/admin_Hampton_Inn_2027')) {
    // initializeServerSideFirebase();
    // const sessionCookie = request.cookies.get('session')?.value;

    // if (!sessionCookie) {
    //   return NextResponse.redirect(new URL('/login', request.url));
    // }

    // try {
    //   // Verify the session cookie.
    //   await getAuth().verifySessionCookie(sessionCookie, true);
    //   // Allow the request to proceed.
    //   return NextResponse.next();
    // } catch (error) {
    //   // Session cookie is invalid. Redirect to login.
    //   const response = NextResponse.redirect(new URL('/login', request.url));
    //   // Clear the invalid cookie
    //   response.cookies.delete('session');
    //   return response;
    // }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin_Hampton_Inn_2027/:path*'],
};
