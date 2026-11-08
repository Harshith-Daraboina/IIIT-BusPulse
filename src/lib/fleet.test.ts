import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ buses: vi.fn(), mget: vi.fn() }));
vi.mock('./db', () => ({ isDemo: () => false, db: { bus: { findMany: mocks.buses } } }));
vi.mock('./redis', () => ({ redis: () => ({ mget: mocks.mget }) }));
import { getFleet } from './fleet';
const bus = {
  id: 'BUS001',
  busNumber: '01',
  vehicleNumber: 'KA25AB1234',
  capacity: 48,
  route: {
    id: 'R01',
    name: 'Campus',
    source: 'City',
    destination: 'College',
    color: '#00836b',
    stops: [],
  },
  driver: { user: { name: 'Driver' } },
  trips: [{ id: 'TRIP001' }],
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.buses.mockResolvedValue([bus]);
});
describe('fleet freshness', () => {
  it('shows fresh GPS and an ETA', async () => {
    mocks.mget.mockResolvedValue([
      {
        tripId: 'TRIP001',
        latitude: 15.36,
        longitude: 75.12,
        speed: 30,
        heading: 0,
        updatedAt: new Date().toISOString(),
      },
    ]);
    const [result] = await getFleet();
    expect(result.status).toBe('ON_TIME');
    expect(result.eta).not.toBeNull();
  });
  it('withholds the ETA when the driver signal is stale', async () => {
    mocks.mget.mockResolvedValue([
      {
        tripId: 'TRIP001',
        latitude: 15.36,
        longitude: 75.12,
        speed: 30,
        heading: 0,
        updatedAt: new Date(Date.now() - 31_000).toISOString(),
      },
    ]);
    const [result] = await getFleet();
    expect(result.status).toBe('STALE');
    expect(result.eta).toBeNull();
  });
  it('ignores GPS belonging to an earlier trip', async () => {
    mocks.mget.mockResolvedValue([{ tripId: 'OLDTRIP', updatedAt: new Date().toISOString() }]);
    const [result] = await getFleet();
    expect(result.location).toBeNull();
    expect(result.status).toBe('STALE');
  });
  it('does not query Redis for an inactive fleet', async () => {
    mocks.buses.mockResolvedValue([{ ...bus, trips: [] }]);
    const [result] = await getFleet();
    expect(result.status).toBe('INACTIVE');
    expect(mocks.mget).not.toHaveBeenCalled();
  });
});
