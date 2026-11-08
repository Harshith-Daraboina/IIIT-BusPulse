import { api } from '@/lib/http';
import { requireRead } from '@/lib/access';
import { db, isDemo } from '@/lib/db';
import { demoHistory } from '@/lib/demo';
import { z } from 'zod';
export async function GET(request: Request) {
  return api(async () => {
    await requireRead();
    const days = z.coerce
      .number()
      .pipe(z.union([z.literal(1), z.literal(7), z.literal(30)]))
      .parse(new URL(request.url).searchParams.get('days') ?? 7);
    if (isDemo()) return { trips: demoHistory(days), demo: true };
    const trips = await db.trip.findMany({
      where: { startTime: { gte: new Date(Date.now() - days * 86_400_000) } },
      include: {
        bus: { include: { route: true } },
        driver: { include: { user: { select: { name: true } } } },
      },
      orderBy: { startTime: 'desc' },
      take: 100,
    });
    return {
      trips: trips.map((trip) => ({
        id: trip.id,
        busNumber: trip.bus.busNumber,
        routeName: trip.bus.route.name,
        driverName: trip.driver.user.name,
        startTime: trip.startTime,
        endTime: trip.endTime,
        status: trip.status,
      })),
      demo: false,
    };
  });
}
