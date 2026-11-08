import { api, HttpError } from '@/lib/http';
import { requireDriver } from '@/lib/access';
import { db } from '@/lib/db';
import { redis, withBusLock } from '@/lib/redis';
import { locationSchema } from '@/lib/schemas';
import { stopProximity } from '@/lib/geo';
import { LiveLocation } from '@/lib/types';

export async function POST(request: Request) {
  return api(async () => {
    const driver = await requireDriver(request);
    const input = locationSchema.parse(await request.json());
    if (driver.busId !== input.busId) throw new HttpError(403, 'This bus is not assigned to you.');
    const timestamp = new Date(input.timestamp);
    if (Math.abs(Date.now() - timestamp.getTime()) > 30_000)
      throw new HttpError(400, 'Location must be recorded within the last 30 seconds.');
    return withBusLock(input.busId, async () => {
      const trip = await db.trip.findFirst({
        where: { busId: input.busId, driverId: driver.id, status: 'ACTIVE' },
      });
      if (!trip) throw new HttpError(409, 'Start a trip before sending location.');
      const cached = await redis().get<LiveLocation>(`bus:${input.busId}`);
      if (cached?.tripId === trip.id && Date.parse(cached.updatedAt) >= timestamp.getTime())
        return { accepted: false, reason: 'Older location ignored' };
      const location: LiveLocation = {
        latitude: input.latitude,
        longitude: input.longitude,
        speed: input.speed,
        heading: input.heading,
        updatedAt: input.timestamp,
        tripId: trip.id,
      };
      // The conditional update claims a sampling slot before history is persisted.
      await db.$transaction(async (transaction) => {
        const sampled = await transaction.trip.updateMany({
          where: {
            id: trip.id,
            status: 'ACTIVE',
            OR: [
              { lastHistoryAt: null },
              { lastHistoryAt: { lte: new Date(timestamp.getTime() - 60_000) } },
            ],
          },
          data: { lastHistoryAt: timestamp },
        });
        if (sampled.count)
          await transaction.locationHistory.create({
            data: {
              tripId: trip.id,
              latitude: input.latitude,
              longitude: input.longitude,
              speed: input.speed,
              timestamp,
            },
          });
        for (const stop of driver.bus?.route.stops ?? []) {
          const proximity = stopProximity(location, stop);
          if (proximity.reached)
            await transaction.stopArrival.upsert({
              where: { tripId_stopId: { tripId: trip.id, stopId: stop.id } },
              create: { tripId: trip.id, stopId: stop.id },
              update: {},
            });
          if (proximity.notify) {
            const subscriptions = await transaction.subscription.findMany({
              where: { stopId: stop.id },
              select: { userId: true },
            });
            if (subscriptions.length)
              await transaction.notification.createMany({
                data: subscriptions.map((subscription) => ({
                  userId: subscription.userId,
                  tripId: trip.id,
                  stopId: stop.id,
                  message: `Bus ${driver.bus?.busNumber} is within 1 km of ${stop.stopName}. Arriving in approximately 5 minutes.`,
                })),
                skipDuplicates: true,
              });
          }
        }
      });
      await redis().set(`bus:${input.busId}`, location, { ex: 90 });
      return { accepted: true };
    });
  });
}
