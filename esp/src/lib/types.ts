export type BusStatus = 'ON_TIME' | 'DELAYED' | 'INACTIVE' | 'STALE';
export type StopInfo = {
  id: string;
  stopName: string;
  latitude: number | null;
  longitude: number | null;
  sequenceNumber: number;
};
export type RouteInfo = {
  id: string;
  name: string;
  source: string;
  destination: string;
  color: string;
  stops: StopInfo[];
};
export type LiveLocation = {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  updatedAt: string;
  tripId: string;
};
export type BusInfo = {
  id: string;
  busNumber: string;
  vehicleNumber: string;
  capacity: number;
  route: RouteInfo;
  driverName: string;
  driverPhone: string;
  status: BusStatus;
  location: LiveLocation | null;
  eta: number | null;
};
export type FleetResponse = { buses: BusInfo[]; demo: boolean; updatedAt: string };
export type HistoryItem = {
  id: string;
  busNumber: string;
  routeName: string;
  driverName: string;
  startTime: string;
  endTime: string | null;
  status: string;
};
export type AlertInfo = { id: string; message: string; read: boolean; createdAt: string };
export const COLLEGE = {
  name: 'IIIT Dharwad',
  latitude: 15.3919083,
  longitude: 75.0247764,
};
