import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { demoRoutes, demoFleet } from '../src/lib/demo';
import { hasCoordinates } from '../src/lib/geo';
const db = new PrismaClient();
async function seed() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const driverPassword = process.env.SEED_DRIVER_PASSWORD;
  if (!adminPassword || adminPassword.length < 12 || !driverPassword || driverPassword.length < 12)
    throw new Error(
      'Set SEED_ADMIN_PASSWORD and SEED_DRIVER_PASSWORD (12+ characters) before seeding.',
    );
  const fleet = demoFleet();
  if (
    await db.trip.count({ where: { status: 'ACTIVE', busId: { in: fleet.map((bus) => bus.id) } } })
  ) {
    throw new Error("Stop seeded buses' active trips before updating route assignments.");
  }
  await db.user.upsert({
    where: { email: 'admin@iiitdwd.ac.in' },
    create: {
      name: 'Transport Admin',
      email: 'admin@iiitdwd.ac.in',
      role: 'ADMIN',
      password: await hash(adminPassword, 12),
    },
    update: {},
  });
  for (const route of demoRoutes) {
    const { stops, ...data } = route;
    await db.route.upsert({ where: { id: route.id }, create: data, update: data });
    for (const stop of stops)
      await db.stop.upsert({
        where: { id: stop.id },
        create: { ...stop, routeId: route.id },
        update: {
          stopName: stop.stopName,
          sequenceNumber: stop.sequenceNumber,
          ...(hasCoordinates(stop) ? { latitude: stop.latitude, longitude: stop.longitude } : {}),
        },
      });
  }
  for (const [index, bus] of fleet.entries()) {
    await db.bus.upsert({
      where: { id: bus.id },
      create: {
        id: bus.id,
        busNumber: bus.busNumber,
        vehicleNumber: bus.vehicleNumber,
        capacity: bus.capacity,
        routeId: bus.route.id,
      },
      update: { routeId: bus.route.id },
    });
    const user = await db.user.upsert({
      where: { email: `driver${index + 1}@kletech.ac.in` },
      create: {
        name: bus.driverName,
        email: `driver${index + 1}@kletech.ac.in`,
        role: 'DRIVER',
        password: await hash(driverPassword, 12),
      },
      update: {},
    });
    await db.driver.upsert({
      where: { id: `DRV00${index + 1}` },
      create: {
        id: `DRV00${index + 1}`,
        userId: user.id,
        licenseNumber: `KA25201600${index + 1}`,
        phone: `900000000${index}`,
        busId: bus.id,
      },
      update: {},
    });
  }
  console.log(
    `Seeded ${demoRoutes.length} directional routes, ${demoRoutes.reduce((total, route) => total + route.stops.length, 0)} stops, ${fleet.length} buses/drivers, and the admin account. Existing historical routes and verified stop pins were preserved.`,
  );
}
seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
