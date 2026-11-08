import { BusInfo, COLLEGE, HistoryItem, RouteInfo } from './types';
import { etaMinutes } from './geo';

const stop = (
  id: string,
  stopName: string,
  latitude: number,
  longitude: number,
  sequenceNumber: number,
) => ({ id, stopName, latitude, longitude, sequenceNumber });
export const demoRoutes: RouteInfo[] = [
  {
    id: 'R01',
    name: 'Vidyanagar Express',
    source: 'Hubballi Railway Station',
    destination: COLLEGE.name,
    color: '#00876c',
    stops: [
      stop('S01', 'Railway Station', 15.3505, 75.1491, 1),
      stop('S02', 'Chennamma Circle', 15.3525, 75.1378, 2),
      stop('S03', 'Deshpande Nagar', 15.3587, 75.1308, 3),
      stop('S04', 'Vidyanagar', 15.3666, 75.1242, 4),
      stop('S05', 'IIIT Dharwad Campus', COLLEGE.latitude, COLLEGE.longitude, 5),
    ],
  },
  {
    id: 'R02',
    name: 'Dharwad Campus Link',
    source: 'Dharwad',
    destination: COLLEGE.name,
    color: '#5676d9',
    stops: [
      stop('S06', 'Dharwad Jubilee Circle', 15.4558, 75.0079, 1),
      stop('S07', 'Sattur', 15.4108, 75.0653, 2),
      stop('S08', 'Navanagar', 15.3975, 75.0958, 3),
      stop('S09', 'Unkal Lake', 15.3871, 75.1118, 4),
      stop('S10', 'IIIT Dharwad Campus', COLLEGE.latitude, COLLEGE.longitude, 5),
    ],
  },
  {
    id: 'R03',
    name: 'Gokul Road Shuttle',
    source: 'Gokul Road',
    destination: COLLEGE.name,
    color: '#dc9750',
    stops: [
      stop('S11', 'Gokul Road', 15.3483, 75.0984, 1),
      stop('S12', 'Akshay Park', 15.3532, 75.1095, 2),
      stop('S13', 'Gokul Junction', 15.3593, 75.1197, 3),
      stop('S14', 'Vidyanagar', 15.3666, 75.1242, 4),
      stop('S15', 'IIIT Dharwad Campus', COLLEGE.latitude, COLLEGE.longitude, 5),
    ],
  },
  {
    id: 'R04',
    name: 'Keshwapur Connector',
    source: 'Keshwapur',
    destination: COLLEGE.name,
    color: '#bb70b1',
    stops: [
      stop('S16', 'Keshwapur', 15.3663, 75.1529, 1),
      stop('S17', 'Kusugal Road', 15.3741, 75.1462, 2),
      stop('S18', 'Shirur Park', 15.3763, 75.1317, 3),
      stop('S19', 'IIIT Dharwad Campus', COLLEGE.latitude, COLLEGE.longitude, 4),
    ],
  },
];

export function demoFleet(): BusInfo[] {
  return Array.from({ length: 6 }, (_, index) => {
    const route = demoRoutes[index % 4];
    const phase = ((Date.now() % 240_000) / 240_000 + index * 0.17) % 1;
    const segment = phase * (route.stops.length - 1);
    const from = route.stops[Math.floor(segment)];
    const to = route.stops[Math.min(Math.floor(segment) + 1, route.stops.length - 1)];
    const ratio = segment % 1;
    const location =
      index === 5
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
      status: index === 5 ? 'INACTIVE' : index === 2 ? 'DELAYED' : 'ON_TIME',
      location,
      eta: etaMinutes(location, COLLEGE),
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
      routeName: demoRoutes[index % 4].name,
      driverName: demoFleet()[index % 6].driverName,
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + (32 + (index % 15)) * 60_000).toISOString(),
      status: 'COMPLETED',
    };
  });
}
