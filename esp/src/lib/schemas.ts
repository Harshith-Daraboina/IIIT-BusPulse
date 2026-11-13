import { z } from 'zod';
const coordinate = (min: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.coerce.number().min(min).max(max).nullable(),
  );
export const stopSchema = z
  .object({
    stopName: z.string().trim().min(1).max(150),
    routeId: z.string().min(1).max(64),
    latitude: coordinate(-90, 90),
    longitude: coordinate(-180, 180),
    sequenceNumber: z.coerce.number().int().min(1).max(200),
  })
  .refine((stop) => (stop.latitude === null) === (stop.longitude === null), {
    message: 'Set both coordinates or leave both blank.',
    path: ['longitude'],
  });
export const locationSchema = z
  .object({
    busId: z.string().min(1).max(64),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    speed: z.number().min(0).max(160),
    heading: z.number().min(0).max(360),
    timestamp: z.iso.datetime(),
  })
  .strict();
export const tripSchema = z.object({ busId: z.string().min(1).max(64) }).strict();
export const occupancySchema = z
  .object({ busId: z.string().min(1).max(64), passengerCount: z.number().int().min(0).max(500) })
  .strict();
export const chatQuerySchema = z.object({ busId: z.string().min(1).max(64) });
export const chatSchema = z
  .object({
    busId: z.string().min(1).max(64),
    name: z.string().trim().min(1).max(40).optional(),
    body: z.string().trim().min(1).max(300),
  })
  .strict();
export const subscriptionSchema = z
  .object({ stopId: z.string().min(1).max(64), enabled: z.boolean() })
  .strict();
