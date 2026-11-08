import type { LiveLocation, StopInfo } from './types';

export function distanceKm(
  latitude: number,
  longitude: number,
  targetLat: number,
  targetLng: number,
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = radians(targetLat - latitude);
  const deltaLng = radians(targetLng - longitude);
  const arc =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(latitude)) * Math.cos(radians(targetLat)) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(Math.max(0, 1 - arc)));
}

export function etaMinutes(
  location: LiveLocation | null,
  stop: Pick<StopInfo, 'latitude' | 'longitude'>,
) {
  if (!location || Date.now() - Date.parse(location.updatedAt) > 30_000) return null;
  const distance = distanceKm(location.latitude, location.longitude, stop.latitude, stop.longitude);
  if (distance <= 0.1) return 0;
  // Phase-one estimate: a conservative speed floor avoids infinite ETAs at traffic lights.
  return Math.max(1, Math.ceil((distance / Math.max(12, Math.min(location.speed, 60))) * 60 * 1.3));
}

export function stopProximity(
  location: Pick<LiveLocation, 'latitude' | 'longitude'>,
  stop: Pick<StopInfo, 'latitude' | 'longitude'>,
) {
  const distance = distanceKm(location.latitude, location.longitude, stop.latitude, stop.longitude);
  return { distance, reached: distance <= 0.1, notify: distance <= 1 };
}
