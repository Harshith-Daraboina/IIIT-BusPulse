import { NextResponse, type NextRequest } from 'next/server';

// The standalone driver website calls these endpoints with a bearer token, so a wildcard origin carries no cookies.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: corsHeaders });
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(corsHeaders)) response.headers.set(name, value);
  return response;
}

export const config = {
  matcher: ['/api/driver/:path*', '/api/trips/:path*', '/api/location', '/api/chat'],
};
