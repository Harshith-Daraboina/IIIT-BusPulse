import { BusInfo, COLLEGE, HistoryItem, RouteInfo } from './types';
import { etaMinutes, hasCoordinates } from './geo';
import { collegeRoutes } from './college-routes';

export const demoRoutes: RouteInfo[] = collegeRoutes;

export function demoFleet(): BusInfo[] {
  return Array.from({ length: 6 }, (_, index) => {
    const route = demoRoutes[index % demoRoutes.length];
    const phase = ((Date.now() % 240_000) / 240_000 + index * 0.17) % 1;
    const segment = phase * (route.stops.length - 1);
    const from = route.stops[Math.floor(segment)];
    const to = route.stops[Math.min(Math.floor(segment) + 1, route.stops.length - 1)];
    const ratio = segment % 1;
    const location =
      index === 5 || !hasCoordinates(from) || !hasCoordinates(to)
        ? null
        : {
            latitude: from.latitude + (to.latitude - from.latitude) * ratio,
            longitude: from.longitude + (to.longitude - from.longitude) * ratio,
            speed: index === 2 ? 16 : 28 + index * 3,
            heading: 300,
            updatedAt: new Date().toISOString(),
            tripId: `DEMO-TRIP-${index}`,
          };
    return {
      id: `BUS00${index + 1}`,
      busNumber: String(index + 1).padStart(2, '0'),
      vehicleNumber: `KA 25 ${['AB', 'CD', 'EF', 'GH', 'JK', 'LM'][index]} ${1234 + index * 111}`,
      capacity: 48,
      passengerCount: location ? 18 + index * 5 : null,
      route,
      driverName: [
        'Ramesh Patil',
        'Suresh Kumar',
        'Prakash Desai',
        'Anil Kulkarni',
        'Mahesh Naik',
        'Vinay Hegde',
      ][index],
      driverPhone: '',
      status: !location ? 'INACTIVE' : index === 2 ? 'DELAYED' : 'ON_TIME',
      location,
      eta: etaMinutes(location, route.stops.at(-1) ?? COLLEGE),
    };
  });
}

export function demoHistory(days: number): HistoryItem[] {
  return Array.from({ length: Math.min(days * 3, 40) }, (_, index) => {
    const start = new Date();
    start.setDate(start.getDate() - Math.floor(index / 3) - 1);
    start.setHours(7 + (index % 3), 15, 0, 0);
    return {
      id: `demo-history-${index}`,
      busNumber: `0${(index % 6) + 1}`,
      routeName: demoRoutes[index % demoRoutes.length].name,
      driverName: demoFleet()[index % 6].driverName,
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + (32 + (index % 15)) * 60_000).toISOString(),
      status: 'COMPLETED',
      distanceKm: 9 + (index % 5) * 1.4,
    };
  });
}
