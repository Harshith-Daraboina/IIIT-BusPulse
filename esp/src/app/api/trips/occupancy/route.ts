import { api, HttpError } from '@/lib/http';
import { requireDriver } from '@/lib/access';
import { db } from '@/lib/db';
import { occupancySchema } from '@/lib/schemas';
export async function POST(request: Request) {
  return api(async () => {
    const driver = await requireDriver(request);
    const { busId, passengerCount } = occupancySchema.parse(await request.json());
    if (!driver.bus || driver.busId !== busId)
      throw new HttpError(403, 'This bus is not assigned to you.');
    if (passengerCount > driver.bus.capacity)
      throw new HttpError(400, `This bus holds ${driver.bus.capacity} passengers.`);
    const updated = await db.trip.updateMany({
      where: { busId, driverId: driver.id, status: 'ACTIVE' },
      data: { passengerCount },
    });
    if (!updated.count) throw new HttpError(409, 'Start a trip before updating passengers.');
    return { passengerCount, capacity: driver.bus.capacity };
  });
}
