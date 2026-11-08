import { auth } from '@/auth';
import { db, isDemo } from './db';
import { HttpError } from './http';
import { jwtVerify } from 'jose';
import { rateLimit } from './redis';

export async function requireUser(roles = ['STUDENT', 'ADMIN', 'DRIVER']) {
  const session = await auth();
  if (!session?.user?.id) throw new HttpError(401, 'Please sign in.');
  // Check current database role so revocation does not depend on JWT expiration.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || !roles.includes(user.role)) throw new HttpError(403, 'Access denied.');
  return user;
}

export async function requireRead() {
  if (!isDemo()) await requireUser();
}

export function jwtSecret() {
  const secret = process.env.DRIVER_JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new HttpError(503, 'Driver authentication is not configured.');
  return new TextEncoder().encode(secret);
}

export async function requireDriver(request: Request) {
  if (isDemo()) throw new HttpError(403, 'Driver writes are disabled in demo mode.');
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Driver token required.');
  let driverId: string;
  try {
    const { payload } = await jwtVerify(header.slice(7), jwtSecret(), {
      issuer: 'campusride',
      audience: 'driver',
      algorithms: ['HS256'],
    });
    if (payload.role !== 'DRIVER' || !payload.sub) throw new Error('Invalid role');
    driverId = payload.sub;
  } catch {
    throw new HttpError(401, 'Invalid or expired driver token.');
  }
  const driver = await db.driver.findUnique({
    where: { id: driverId },
    include: {
      user: true,
      bus: { include: { route: { include: { stops: { orderBy: { sequenceNumber: 'asc' } } } } } },
    },
  });
  if (!driver || driver.user.role !== 'DRIVER') throw new HttpError(403, 'Driver access revoked.');
  await rateLimit(`driver:${driver.id}`, 30, 60);
  return driver;
}
