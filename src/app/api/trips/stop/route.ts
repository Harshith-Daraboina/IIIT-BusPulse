import { api, HttpError } from '@/lib/http';
import { requireDriver } from '@/lib/access';
import { db } from '@/lib/db';
import { tripSchema } from '@/lib/schemas';
import { redis, withBusLock } from '@/lib/redis';
export async function POST(request: Request) {
  return api(async () => {
    const driver = await requireDriver(request);
    const { busId } = tripSchema.parse(await request.json());
    if (driver.busId !== busId) throw new HttpError(403, 'This bus is not assigned to you.');
    return withBusLock(busId, async () => {
      await db.trip.updateMany({
        where: { busId, driverId: driver.id, status: 'ACTIVE' },
        data: { status: 'COMPLETED', endTime: new Date(), activeBusId: null, activeDriverId: null },
      });
      await redis().del(`bus:${busId}`);
      return { success: true };
    });
  });
}
