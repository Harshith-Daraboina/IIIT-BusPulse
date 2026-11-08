import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/lib/http';

const mocks = vi.hoisted(() => ({ fleet: vi.fn(), history: vi.fn(), requireUser: vi.fn(), isDemo: vi.fn() }));
vi.mock('@/lib/access', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/db', () => ({ isDemo: mocks.isDemo, db: { trip: { findMany: mocks.history } } }));
vi.mock('@/lib/fleet', () => ({ getFleet: mocks.fleet }));

import { GET as fleet } from './route';
import { GET as eta } from '../eta/route';
import { GET as history } from '../history/route';
import { GET as admin } from '../admin/route';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.isDemo.mockReturnValue(false);
  mocks.requireUser.mockRejectedValue(new HttpError(401, 'Please sign in.'));
  mocks.history.mockResolvedValue([]);
  mocks.fleet.mockResolvedValue([
    { id: 'BUS001', location: null, route: { stops: [{ id: 'S01', latitude: 15.39, longitude: 75.02 }] } },
  ]);
});

describe('public student access in real-service mode', () => {
  it('returns the fleet without a session', async () => {
    const response = await fleet();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ demo: false, buses: [{ id: 'BUS001' }] });
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it('returns a selected-stop ETA without a session', async () => {
    const response = await eta(new Request('http://localhost/api/eta?busId=BUS001&stopId=S01'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ minutes: null, estimated: true });
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it('returns trip history without a session', async () => {
    const response = await history(new Request('http://localhost/api/history?days=7'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ trips: [], demo: false });
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it('still rejects anonymous admin reads', async () => {
    const response = await admin(new Request('http://localhost/api/admin?entity=buses'));
    expect(response.status).toBe(401);
    expect(mocks.requireUser).toHaveBeenCalledWith(['ADMIN']);
  });

  it('does not bypass admin authentication in demo mode', async () => {
    mocks.isDemo.mockReturnValue(true);
    const response = await admin(new Request('http://localhost/api/admin?entity=buses'));
    expect(response.status).toBe(401);
  });
});