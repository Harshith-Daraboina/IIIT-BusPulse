import { api, HttpError } from '@/lib/http';
import { requireRead } from '@/lib/access';
import { getFleet } from '@/lib/fleet';
import { etaMinutes } from '@/lib/geo';
export async function GET(request: Request) {
  return api(async () => {
    await requireRead();
    const params = new URL(request.url).searchParams;
    const bus = (await getFleet()).find((bus) => bus.id === params.get('busId'));
    const stop = bus?.route.stops.find((stop) => stop.id === params.get('stopId'));
    if (!bus || !stop) throw new HttpError(404, 'Bus or stop not found.');
    const minutes = etaMinutes(bus.location, stop);
    return {
      eta: minutes === null ? null : minutes === 0 ? 'Arriving' : `${minutes} mins`,
      minutes,
      estimated: true,
    };
  });
}
