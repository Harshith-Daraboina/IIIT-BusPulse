import { api } from '@/lib/http';
import { getAdminData, getAnalytics } from '@/lib/admin-data';
import { z } from 'zod';
export async function GET(request: Request) {
  return api(async () => {
    const entity = new URL(request.url).searchParams.get('entity');
    if (entity === 'analytics') return getAnalytics();
    return getAdminData(
      z.enum(['buses', 'routes', 'stops', 'drivers', 'users']).parse(entity ?? 'buses'),
    );
  });
}
