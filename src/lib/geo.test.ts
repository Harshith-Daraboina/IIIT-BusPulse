import { describe, expect, it } from 'vitest';
import { distanceKm, etaMinutes, stopProximity } from './geo';
import { locationSchema } from './schemas';
describe('tracking calculations', () => {
  const stop = { latitude: 15.3693, longitude: 75.1221 };
  it('returns zero at the same position', () => {
    expect(distanceKm(15.3693, 75.1221, 15.3693, 75.1221)).toBe(0);
  });
  it('measures a degree of latitude as approximately 111 km', () => {
    expect(distanceKm(0, 0, 1, 0)).toBeCloseTo(111.195, 2);
  });
  it('marks a 100-meter arrival independently of the 1-km alert', () => {
    expect(stopProximity(stop, stop)).toMatchObject({ reached: true, notify: true });
    expect(stopProximity({ latitude: 15.3743, longitude: stop.longitude }, stop)).toMatchObject({
      reached: false,
      notify: true,
    });
    expect(stopProximity({ latitude: 15.4, longitude: stop.longitude }, stop)).toMatchObject({
      reached: false,
      notify: false,
    });
  });
  it('withholds stale ETAs and handles stopped vehicles', () => {
    const location = {
      ...stop,
      latitude: 15.35,
      speed: 0,
      heading: 0,
      updatedAt: new Date().toISOString(),
      tripId: 'test',
    };
    expect(etaMinutes(location, stop)).toBeGreaterThan(0);
    expect(
      etaMinutes({ ...location, updatedAt: new Date(Date.now() - 31_000).toISOString() }, stop),
    ).toBeNull();
    expect(etaMinutes(null, stop)).toBeNull();
  });
  it('rejects invalid coordinates and malformed GPS payloads', () => {
    expect(
      locationSchema.safeParse({
        busId: 'BUS001',
        latitude: 95,
        longitude: 75,
        speed: 20,
        heading: 0,
        timestamp: new Date().toISOString(),
      }).success,
    ).toBe(false);
  });
});
