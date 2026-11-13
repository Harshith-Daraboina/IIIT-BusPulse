export type AdminEntity = 'buses' | 'routes' | 'stops' | 'drivers' | 'users';
export type AdminRow = Record<string, string | number>;
export type FieldConfig = {
  key: string;
  label: string;
  type?: string;
  options?: 'routes' | 'users' | 'buses' | 'roles';
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
};
export const adminConfig: Record<
  AdminEntity,
  { title: string; singular: string; columns: string[]; fields: FieldConfig[] }
> = {
  buses: {
    title: 'Bus management',
    singular: 'bus',
    columns: ['id', 'busNumber', 'vehicleNumber', 'capacity', 'routeName'],
    fields: [
      { key: 'id', label: 'Bus ID', required: true },
      { key: 'busNumber', label: 'Bus number', required: true },
      { key: 'vehicleNumber', label: 'Vehicle registration', required: true },
      { key: 'capacity', label: 'Capacity', type: 'number', min: 1, max: 100, required: true },
      { key: 'routeId', label: 'Assigned route', options: 'routes', required: true },
    ],
  },
  routes: {
    title: 'Route management',
    singular: 'route',
    columns: ['name', 'source', 'destination', 'stopCount'],
    fields: [
      { key: 'name', label: 'Route name', required: true },
      { key: 'source', label: 'Starting point', required: true },
      { key: 'destination', label: 'Destination', required: true },
      { key: 'color', label: 'Route color', type: 'color', required: true },
    ],
  },
  stops: {
    title: 'Bus stops',
    singular: 'stop',
    columns: ['stopName', 'routeName', 'latitude', 'longitude', 'sequenceNumber'],
    fields: [
      { key: 'stopName', label: 'Stop name', required: true },
      { key: 'routeId', label: 'Route', options: 'routes', required: true },
      {
        key: 'latitude',
        label: 'Latitude',
        type: 'number',
        min: -90,
        max: 90,
        step: 'any',
        required: false,
      },
      {
        key: 'longitude',
        label: 'Longitude',
        type: 'number',
        min: -180,
        max: 180,
        step: 'any',
        required: false,
      },
      {
        key: 'sequenceNumber',
        label: 'Stop sequence',
        type: 'number',
        min: 1,
        max: 200,
        required: true,
      },
    ],
  },
  drivers: {
    title: 'Driver management',
    singular: 'driver',
    columns: ['id', 'name', 'licenseNumber', 'phone', 'busNumber'],
    fields: [
      { key: 'id', label: 'Driver ID', required: true },
      { key: 'userId', label: 'Driver user account', options: 'users', required: true },
      { key: 'licenseNumber', label: 'License number', required: true },
      { key: 'phone', label: 'Phone', type: 'tel', required: true },
      { key: 'busId', label: 'Assigned bus', options: 'buses' },
    ],
  },
  users: {
    title: 'User management',
    singular: 'user',
    columns: ['name', 'email', 'role', 'createdAt'],
    fields: [
      { key: 'name', label: 'Full name', required: true },
      { key: 'email', label: 'College email', type: 'email', required: true },
      { key: 'role', label: 'Role', options: 'roles', required: true },
      { key: 'password', label: 'Password (8+ characters)', type: 'password' },
    ],
  },
};
export type AdminData = {
  rows: AdminRow[];
  routes: AdminRow[];
  buses: AdminRow[];
  users: AdminRow[];
  demo: boolean;
};
export type Analytics = {
  daily: { day: string; count: number }[];
  routes: { name: string; count: number }[];
  drivers: { name: string; trips: number; average: number; hours: number; km: number }[];
  average: number;
  completed: number;
};
