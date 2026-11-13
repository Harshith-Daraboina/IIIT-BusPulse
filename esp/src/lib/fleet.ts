import { db, isDemo } from './db';
import { demoFleet } from './demo';
import { redis } from './redis';
import { BusInfo, COLLEGE, LiveLocation } from './types';
import { etaMinutes } from './geo';

export async function getFleet(): Promise<BusInfo[]> {
  if (isDemo()) return demoFleet();
  const buses = await db.bus.findMany({
    include: {
      route: { include: { stops: { orderBy: { sequenceNumber: 'asc' } } } },
      driver: { include: { user: { select: { name: true } } } },
      trips: { where: { status: 'ACTIVE' }, select: { id: true, passengerCount: true }, take: 1 },
    },
    orderBy: { busNumber: 'asc' },
  });
  const active = buses.filter((bus) => bus.trips.length);
  // Batch only active bus keys; old-trip cache entries must not leak into a new trip.
  const locations = active.length
    ? await redis().mget<(LiveLocation | null)[]>(...active.map((bus) => `bus:${bus.id}`))
    : [];
  const locationById = new Map(active.map((bus, index) => [bus.id, locations[index]]));
  return buses.map((bus) => {
    const cached = locationById.get(bus.id);
    const location = cached?.tripId === bus.trips[0]?.id ? (cached ?? null) : null;
    const status = !bus.trips.length
      ? 'INACTIVE'
      : !location || Date.now() - Date.parse(location.updatedAt) > 30_000
        ? 'STALE'
        : 'ON_TIME';
    return {
      id: bus.id,
      busNumber: bus.busNumber,
      vehicleNumber: bus.vehicleNumber,
      capacity: bus.capacity,
      passengerCount: bus.trips[0]?.passengerCount ?? null,
      route: bus.route,
      driverName: bus.driver?.user.name ?? 'Unassigned',
      driverPhone: '',
      status,
      location,
      eta: etaMinutes(location, bus.route.stops.at(-1) ?? COLLEGE),
    };
  });
}
