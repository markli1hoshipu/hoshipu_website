import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  // Add pathname header for layout to detect YIF routes
  // Guard against null response from intlMiddleware
  if (response) {
    response.headers.set('x-pathname', request.nextUrl.pathname);
  }

  return response;
}

export const config = {
  // Skip all paths that should not be internationalized
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
