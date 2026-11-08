import { api, HttpError } from '@/lib/http';
import { db, isDemo } from '@/lib/db';
import { rateLimit } from '@/lib/redis';
import { jwtSecret } from '@/lib/access';
import { SignJWT } from 'jose';
import { compare } from 'bcryptjs';
import { z } from 'zod';
export async function POST(request: Request) {
  return api(async () => {
    if (isDemo()) throw new HttpError(403, 'Driver authentication is disabled in demo mode.');
    const { driverId, password } = z
      .object({ driverId: z.string().min(1).max(64), password: z.string().min(8).max(128) })
      .strict()
      .parse(await request.json());
    await rateLimit(`driver-login:${driverId}`, 10, 900);
    const driver = await db.driver.findUnique({
      where: { id: driverId },
      include: {
        user: true,
        bus: { include: { route: { include: { stops: { orderBy: { sequenceNumber: 'asc' } } } } } },
      },
    });
    if (
      !driver ||
      driver.user.role !== 'DRIVER' ||
      !(await compare(password, driver.user.password))
    )
      throw new HttpError(401, 'Invalid driver ID or password.');
    const token = await new SignJWT({ role: 'DRIVER' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(driver.id)
      .setIssuer('campusride')
      .setAudience('driver')
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(jwtSecret());
    return {
      token,
      expiresIn: 28800,
      driver: { id: driver.id, name: driver.user.name },
      bus: driver.bus,
    };
  });
}
