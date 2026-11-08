import { z } from 'zod';
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
export const subscriptionSchema = z
  .object({ stopId: z.string().min(1).max(64), enabled: z.boolean() })
  .strict();
