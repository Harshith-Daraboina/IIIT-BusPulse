'use server';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { db, isDemo } from '@/lib/db';
import { requireUser } from '@/lib/access';
import { revalidatePath } from 'next/cache';
import { AdminEntity } from '@/lib/admin-config';
import { Prisma } from '@prisma/client';
const text = z.string().trim().min(1).max(150);
const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const schemas = {
  buses: z.object({
    id: identifier,
    busNumber: text,
    vehicleNumber: text,
    capacity: z.coerce.number().int().min(1).max(100),
    routeId: text,
  }),
  routes: z.object({
    name: text,
    source: text,
    destination: text,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  stops: z.object({
    stopName: text,
    routeId: text,
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    sequenceNumber: z.coerce.number().int().min(1).max(200),
  }),
  drivers: z.object({
    id: identifier,
    userId: text,
    licenseNumber: text,
    phone: z.string().regex(/^\+?[0-9 ()-]{8,20}$/),
    busId: z
      .string()
      .max(64)
      .transform((value) => value || null),
  }),
  users: z.object({
    name: text,
    email: z.email().toLowerCase(),
    role: z.enum(['ADMIN', 'DRIVER', 'STUDENT']),
    password: z.union([z.literal(''), z.string().min(8).max(128)]),
  }),
};
async function assertEditable(
  entity: AdminEntity,
  id: string | null,
  data?: Record<string, unknown>,
) {
  if (entity === 'buses' && id && (await db.trip.count({ where: { busId: id, status: 'ACTIVE' } })))
    throw new Error('Stop the active trip before editing this bus.');
  if (
    entity === 'drivers' &&
    id &&
    (await db.trip.count({ where: { driverId: id, status: 'ACTIVE' } }))
  )
    throw new Error('Stop the active trip before editing this driver.');
  if (
    entity === 'users' &&
    id &&
    (await db.trip.count({ where: { driver: { userId: id }, status: 'ACTIVE' } }))
  )
    throw new Error('This user is currently driving an active trip.');
  if (entity === 'routes' || entity === 'stops') {
    const oldStop =
      entity === 'stops' && id
        ? await db.stop.findUnique({ where: { id }, select: { routeId: true } })
        : null;
    const routeIds = [entity === 'routes' ? id : oldStop?.routeId, data?.routeId].filter(
      (value): value is string => typeof value === 'string',
    );
    if (
      routeIds.length &&
      (await db.trip.count({ where: { status: 'ACTIVE', bus: { routeId: { in: routeIds } } } }))
    )
      throw new Error('Routes with running trips cannot be changed.');
  }
}
export async function saveRecord(entityInput: AdminEntity, id: string | null, input: unknown) {
  try {
    if (isDemo()) throw new Error('Persistent writes are disabled in demo mode.');
    const actor = await requireUser(['ADMIN']);
    const entity = z.enum(['buses', 'routes', 'stops', 'drivers', 'users']).parse(entityInput);
    if (id) identifier.parse(id);
    const data = schemas[entity].parse(input);
    await assertEditable(entity, id, data);
    if (entity === 'buses') {
      const value = schemas.buses.parse(input);
      if (id && value.id !== id) throw new Error('Bus ID cannot be changed.');
      if (id) await db.bus.update({ where: { id }, data: value });
      else await db.bus.create({ data: value });
    }
    if (entity === 'routes') {
      const value = schemas.routes.parse(input);
      if (id) await db.route.update({ where: { id }, data: value });
      else await db.route.create({ data: value });
    }
    if (entity === 'stops') {
      const value = schemas.stops.parse(input);
      if (id) await db.stop.update({ where: { id }, data: value });
      else await db.stop.create({ data: value });
    }
    if (entity === 'drivers') {
      const value = schemas.drivers.parse(input);
      if (id && value.id !== id) throw new Error('Driver ID cannot be changed.');
      const user = await db.user.findUnique({ where: { id: value.userId } });
      if (user?.role !== 'DRIVER') throw new Error('Select a user with the DRIVER role.');
      if (value.busId && (await db.trip.count({ where: { busId: value.busId, status: 'ACTIVE' } })))
        throw new Error('Selected bus is on an active trip.');
      if (id) await db.driver.update({ where: { id }, data: value });
      else await db.driver.create({ data: value });
    }
    if (entity === 'users') {
      const value = schemas.users.parse(input);
      if (id === actor.id && value.role !== 'ADMIN')
        throw new Error('You cannot demote your own account.');
      if (!id && !value.password) throw new Error('A password is required for new users.');
      const { password, ...profile } = value;
      const hashed = password ? await hash(password, 12) : undefined;
      if (id)
        await db.user.update({
          where: { id },
          data: { ...profile, ...(hashed ? { password: hashed } : {}) },
        });
      else await db.user.create({ data: { ...profile, password: hashed! } });
    }
    revalidatePath('/admin');
    return { success: true, error: '' };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof z.ZodError
          ? 'Check all required fields and numeric ranges.'
          : error instanceof Prisma.PrismaClientKnownRequestError
            ? 'Data conflicts with an existing record or linked trip.'
            : error instanceof Error
              ? error.message
              : 'Unable to save record.',
    };
  }
}
export async function deleteRecord(entityInput: AdminEntity, idInput: string) {
  try {
    if (isDemo()) throw new Error('Persistent writes are disabled in demo mode.');
    const actor = await requireUser(['ADMIN']);
    const entity = z.enum(['buses', 'routes', 'stops', 'drivers', 'users']).parse(entityInput);
    const id = identifier.parse(idInput);
    if (entity === 'users' && id === actor.id)
      throw new Error('You cannot delete your own account.');
    await assertEditable(entity, id);
    if (entity === 'buses') await db.bus.delete({ where: { id } });
    if (entity === 'routes') await db.route.delete({ where: { id } });
    if (entity === 'stops') await db.stop.delete({ where: { id } });
    if (entity === 'drivers') await db.driver.delete({ where: { id } });
    if (entity === 'users') await db.user.delete({ where: { id } });
    revalidatePath('/admin');
    return { success: true, error: '' };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Prisma.PrismaClientKnownRequestError
          ? 'This record is linked to other data. Remove assignments first; trip history is preserved.'
          : error instanceof Error
            ? error.message
            : 'Unable to delete record.',
    };
  }
}
