import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login page
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Allow access to auth API routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Allow access to static files and public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for JWT token
  const token = await getToken({
    req: request,
    secret: process.env.JWT_SECRET || 'commission-calculator-jwt-secret-dev',
  });

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control
  const role = token.role as string;

  // Admin-only routes
  const adminOnlyRoutes = ['/api/auth/register'];
  if (adminOnlyRoutes.some((route) => pathname.startsWith(route)) && role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'شما دسترسی به این بخش ندارید' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - fonts (font files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|fonts|favicon\\.ico).*)',
  ],
};
