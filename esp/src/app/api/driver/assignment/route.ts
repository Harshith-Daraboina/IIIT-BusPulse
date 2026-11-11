import { api } from '@/lib/http';
import { requireDriver } from '@/lib/access';
import { db } from '@/lib/db';
export async function GET(request: Request) {
  return api(async () => {
    const driver = await requireDriver(request);
    return {
      bus: driver.bus,
      trip: await db.trip.findFirst({ where: { driverId: driver.id, status: 'ACTIVE' } }),
    };
  });
}
