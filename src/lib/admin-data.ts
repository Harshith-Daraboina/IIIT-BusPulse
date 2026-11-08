import { db, isDemo } from './db';
import { requireUser } from './access';
import { demoFleet, demoHistory, demoRoutes } from './demo';
import { AdminData, AdminEntity, AdminRow, Analytics } from './admin-config';
export async function getAdminData(entity: AdminEntity): Promise<AdminData> {
  await requireUser(['ADMIN']);
  if (isDemo()) {
    const buses = demoFleet().map((bus) => ({
      id: bus.id,
      busNumber: bus.busNumber,
      vehicleNumber: bus.vehicleNumber,
      capacity: bus.capacity,
      routeId: bus.route.id,
      routeName: bus.route.name,
    }));
    const routes = demoRoutes.map((route) => ({
      id: route.id,
      name: route.name,
      source: route.source,
      destination: route.destination,
      color: route.color,
      stopCount: route.stops.length,
    }));
    const users = [
      {
        id: 'ADMIN001',
        name: 'Transport Admin',
        email: 'admin@iiitdwd.ac.in',
        role: 'ADMIN',
        createdAt: '2026-11-01',
      },
      {
        id: 'STUDENT001',
        name: 'Arjun Sharma',
        email: 'arjun@iiitdwd.ac.in',
        role: 'STUDENT',
        createdAt: '2026-11-01',
      },
      ...demoFleet().map((bus, index) => ({
        id: `USER${index + 1}`,
        name: bus.driverName,
        email: `driver${index + 1}@iiitdwd.ac.in`,
        role: 'DRIVER',
        createdAt: '2026-11-01',
      })),
    ];
    const drivers = demoFleet().map((bus, index) => ({
      id: `DRV00${index + 1}`,
      userId: `USER${index + 1}`,
      name: bus.driverName,
      licenseNumber: `KA25201600${index + 1}`,
      phone: `900000000${index}`,
      busId: bus.id,
      busNumber: bus.busNumber,
    }));
    const stops = demoRoutes.flatMap((route) =>
      route.stops.map((stop) => ({ ...stop, routeId: route.id, routeName: route.name })),
    );
    return {
      rows: { buses, routes, users, drivers, stops }[entity],
      routes,
      buses,
      users,
      demo: true,
    };
  }
  const [routes, buses, users] = await Promise.all([
    db.route.findMany({
      include: { _count: { select: { stops: true } } },
      orderBy: { name: 'asc' },
    }),
    db.bus.findMany({ include: { route: true }, orderBy: { busNumber: 'asc' } }),
    db.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: 'asc' },
    }),
  ]);
  const routeRows = routes.map((route) => ({
    id: route.id,
    name: route.name,
    source: route.source,
    destination: route.destination,
    color: route.color,
    stopCount: route._count.stops,
  }));
  const busRows = buses.map((bus) => ({
    id: bus.id,
    busNumber: bus.busNumber,
    vehicleNumber: bus.vehicleNumber,
    capacity: bus.capacity,
    routeId: bus.routeId,
    routeName: bus.route.name,
  }));
  const userRows = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString().slice(0, 10),
  }));
  let rows: AdminRow[] = [];
  if (entity === 'routes') rows = routeRows;
  if (entity === 'buses') rows = busRows;
  if (entity === 'users') rows = userRows;
  if (entity === 'drivers')
    rows = (
      await db.driver.findMany({
        include: { user: { select: { name: true } }, bus: { select: { busNumber: true } } },
      })
    ).map((driver) => ({
      id: driver.id,
      userId: driver.userId,
      name: driver.user.name,
      licenseNumber: driver.licenseNumber,
      phone: driver.phone,
      busId: driver.busId ?? '',
      busNumber: driver.bus?.busNumber ?? 'Unassigned',
    }));
  if (entity === 'stops')
    rows = (
      await db.stop.findMany({
        include: { route: { select: { name: true } } },
        orderBy: [{ routeId: 'asc' }, { sequenceNumber: 'asc' }],
      })
    ).map((stop) => ({
      id: stop.id,
      routeId: stop.routeId,
      routeName: stop.route.name,
      stopName: stop.stopName,
      latitude: stop.latitude,
      longitude: stop.longitude,
      sequenceNumber: stop.sequenceNumber,
    }));
  return { rows, routes: routeRows, buses: busRows, users: userRows, demo: false };
}
export async function getAnalytics(): Promise<Analytics> {
  await requireUser(['ADMIN']);
  const history = isDemo()
    ? demoHistory(30)
    : (
        await db.trip.findMany({
          where: { status: 'COMPLETED', startTime: { gte: new Date(Date.now() - 30 * 86400000) } },
          include: {
            bus: { include: { route: true } },
            driver: { include: { user: { select: { name: true } } } },
          },
          take: 5000,
          orderBy: { startTime: 'desc' },
        })
      ).map((trip) => ({
        ...trip,
        busNumber: trip.bus.busNumber,
        routeName: trip.bus.route.name,
        driverName: trip.driver.user.name,
        startTime: trip.startTime.toISOString(),
        endTime: trip.endTime?.toISOString() ?? null,
      }));
  const valid = history.filter((trip) => trip.endTime);
  const duration = (trip: (typeof history)[number]) =>
    (Date.parse(trip.endTime!) - Date.parse(trip.startTime)) / 60000;
  const routeNames = [...new Set(valid.map((trip) => trip.routeName))];
  const driverNames = [...new Set(valid.map((trip) => trip.driverName))];
  const dayKey = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  return {
    completed: valid.length,
    average: valid.length
      ? Math.round(valid.reduce((sum, trip) => sum + duration(trip), 0) / valid.length)
      : 0,
    routes: routeNames.map((name) => ({
      name,
      count: valid.filter((trip) => trip.routeName === name).length,
    })),
    drivers: driverNames.map((name) => {
      const trips = valid.filter((trip) => trip.driverName === name);
      return {
        name,
        trips: trips.length,
        average: Math.round(trips.reduce((sum, trip) => sum + duration(trip), 0) / trips.length),
      };
    }),
    daily: Array.from({ length: 7 }, (_, index) => {
      const date = new Date(Date.now() - (6 - index) * 86400000);
      return {
        day: date.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }),
        count: new Set(
          valid
            .filter((trip) => dayKey(new Date(trip.startTime)) === dayKey(date))
            .map((trip) => trip.busNumber),
        ).size,
      };
    }),
  };
}
