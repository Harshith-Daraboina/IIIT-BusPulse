import { handlers } from '@/auth';
import { isDemo } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  if (isDemo()) return NextResponse.json(null);
  return handlers.GET(request);
}
export async function POST(request: NextRequest) {
  if (isDemo())
    return NextResponse.json({ error: 'Sign-in is disabled in demo mode.' }, { status: 403 });
  return handlers.POST(request);
}
