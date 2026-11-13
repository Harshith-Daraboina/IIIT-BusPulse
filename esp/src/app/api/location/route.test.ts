import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  requireDriver: vi.fn(),
  findTrip: vi.fn(),
  cached: vi.fn(),
  set: vi.fn(),
  sample: vi.fn(),
  history: vi.fn(),
  arrival: vi.fn(),
  subscriptions: vi.fn(),
  notifications: vi.fn(),
  transaction: vi.fn(),
  distance: vi.fn(),
}));
vi.mock('@/lib/access', () => ({ requireDriver: mocks.requireDriver }));
vi.mock('@/lib/db', () => ({
  db: { trip: { findFirst: mocks.findTrip }, $transaction: mocks.transaction },
}));
vi.mock('@/lib/redis', () => ({
  redis: () => ({ get: mocks.cached, set: mocks.set }),
  withBusLock: async (_id: string, callback: () => Promise<unknown>) => callback(),
}));
import { POST } from './route';
const request = (overrides = {}) =>
  new Request('http://localhost/api/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      busId: 'BUS001',
      latitude: 15.3693,
      longitude: 75.1221,
      speed: 30,
      heading: 120,
      timestamp: new Date().toISOString(),
      ...overrides,
    }),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireDriver.mockResolvedValue({
    id: 'DRV001',
    busId: 'BUS001',
    bus: {
      busNumber: '01',
      route: { stops: [{ id: 'S01', latitude: 15.3693, longitude: 75.1221, stopName: 'Campus' }] },
    },
  });
  mocks.findTrip.mockResolvedValue({ id: 'TRIP001' });
  mocks.cached.mockResolvedValue(null);
  mocks.sample.mockResolvedValue({ count: 1 });
  mocks.subscriptions.mockResolvedValue([{ userId: 'STUDENT001' }]);
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      trip: { updateMany: mocks.sample, update: mocks.distance },
      locationHistory: { create: mocks.history },
      stopArrival: { upsert: mocks.arrival },
      subscription: { findMany: mocks.subscriptions },
      notification: { createMany: mocks.notifications },
    }),
  );
});
describe('GPS ingestion', () => {
  it('rejects locations for an unassigned bus', async () => {
    expect((await POST(request({ busId: 'BUS002' }))).status).toBe(403);
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('rejects invalid coordinates', async () => {
    expect((await POST(request({ latitude: 91 }))).status).toBe(400);
  });
  it('rejects stale timestamps', async () => {
    expect(
      (await POST(request({ timestamp: new Date(Date.now() - 60_000).toISOString() }))).status,
    ).toBe(400);
  });
  it('requires an active owned trip', async () => {
    mocks.findTrip.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(409);
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('does not let an out-of-order update overwrite live GPS', async () => {
    mocks.cached.mockResolvedValue({
      tripId: 'TRIP001',
      updatedAt: new Date(Date.now() + 1000).toISOString(),
    });
    const response = await POST(request());
    expect(await response.json()).toMatchObject({ accepted: false });
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('records history, geofences, and one deduplicated alert per subscription', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: true });
    expect(mocks.history).toHaveBeenCalledOnce();
    expect(mocks.arrival).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tripId_stopId: { tripId: 'TRIP001', stopId: 'S01' } } }),
    );
    expect(mocks.notifications).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: [expect.objectContaining({ userId: 'STUDENT001', tripId: 'TRIP001', stopId: 'S01' })],
      }),
    );
    expect(mocks.set).toHaveBeenCalledWith(
      'bus:BUS001',
      expect.objectContaining({ tripId: 'TRIP001', latitude: 15.3693 }),
      { ex: 90 },
    );
  });
  it('adds the distance travelled since the previous fix to the trip', async () => {
    mocks.cached.mockResolvedValue({
      tripId: 'TRIP001',
      latitude: 15.3693,
      longitude: 75.1219,
      updatedAt: new Date(Date.now() - 10_000).toISOString(),
    });
    await POST(request());
    const increment = mocks.distance.mock.calls[0][0].data.distanceKm.increment;
    expect(increment).toBeGreaterThan(0.015);
    expect(increment).toBeLessThan(0.03);
  });
  it('does not persist history between 60-second sampling slots', async () => {
    mocks.sample.mockResolvedValue({ count: 0 });
    await POST(request());
    expect(mocks.history).not.toHaveBeenCalled();
    expect(mocks.set).toHaveBeenCalledOnce();
  });
});
