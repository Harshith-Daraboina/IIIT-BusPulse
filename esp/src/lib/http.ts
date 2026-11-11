import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api(callback: () => Promise<unknown>) {
  try {
    return NextResponse.json(await callback(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof HttpError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError || error instanceof SyntaxError)
      return NextResponse.json(
        {
          error: 'Invalid request data.',
          ...(error instanceof ZodError ? { issues: error.issues } : {}),
        },
        { status: 400 },
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2002', 'P2003', 'P2025'].includes(error.code)
    )
      return NextResponse.json(
        { error: 'Record conflicts with existing data or was not found.' },
        { status: 409 },
      );
    console.error('API failure', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Service unavailable. Please try again.' }, { status: 503 });
  }
}
