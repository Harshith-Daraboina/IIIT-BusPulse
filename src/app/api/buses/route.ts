import { api } from '@/lib/http';
import { getFleet } from '@/lib/fleet';
import { isDemo } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  return api(async () => {
    return { buses: await getFleet(), demo: isDemo(), updatedAt: new Date().toISOString() };
  });
}
