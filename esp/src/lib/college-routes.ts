import { COLLEGE, type RouteInfo, type StopInfo } from './types';

const places = {
  campus: {
    stopName: 'IIIT Dharwad Campus',
    latitude: COLLEGE.latitude,
    longitude: COLLEGE.longitude,
  },
  transit: { stopName: 'Transit Hostel', latitude: null, longitude: null },
  shivaji: { stopName: 'Shivaji Hostel', latitude: null, longitude: null },
  sattur: { stopName: 'Sattur', latitude: null, longitude: null },
  chirayu: { stopName: 'Chirayu', latitude: null, longitude: null },
} satisfies Record<string, Pick<StopInfo, 'stopName' | 'latitude' | 'longitude'>>;

type Place = keyof typeof places;
function route(
  id: string,
  source: Place,
  destination: Place,
  via: Place[],
  color: string,
): RouteInfo {
  return {
    id,
    name: [source, ...via, destination].map((place) => places[place].stopName).join(' → '),
    source: places[source].stopName,
    destination: places[destination].stopName,
    color,
    stops: [source, ...via, destination].map((place, index) => ({
      id: `${id}-S${index + 1}`,
      ...places[place],
      sequenceNumber: index + 1,
    })),
  };
}

// Hostel and intermediate-stop pins remain unset until their locations are verified.
export const collegeRoutes: RouteInfo[] = [
  route('R02', 'campus', 'transit', ['shivaji'], '#5e1ef4'),
];
