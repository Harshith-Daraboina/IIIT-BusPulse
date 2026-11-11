import { describe, expect, it } from 'vitest';
import { collegeRoutes } from './college-routes';

describe('IIIT Dharwad transport routes', () => {
  it('contains only the main campus route through both hostels', () => {
    expect(collegeRoutes).toHaveLength(1);
    expect(collegeRoutes[0]).toMatchObject({
      id: 'R02',
      source: 'IIIT Dharwad Campus',
      destination: 'Transit Hostel',
      name: 'IIIT Dharwad Campus → Shivaji Hostel → Transit Hostel',
    });
    expect(collegeRoutes[0].stops.map((stop) => stop.stopName)).toEqual([
      'IIIT Dharwad Campus',
      'Shivaji Hostel',
      'Transit Hostel',
    ]);
  });

  it('has ordered stops and does not invent missing coordinates', () => {
    for (const route of collegeRoutes) {
      expect(route.stops.map((stop) => stop.sequenceNumber)).toEqual(
        route.stops.map((_, index) => index + 1),
      );
      for (const stop of route.stops.filter((stop) => stop.stopName !== 'IIIT Dharwad Campus')) {
        expect(stop.latitude).toBeNull();
        expect(stop.longitude).toBeNull();
      }
    }
  });
});
