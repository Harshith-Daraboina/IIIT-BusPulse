import { api } from '@/lib/http';
import { requireRead } from '@/lib/access';
import { getFleet } from '@/lib/fleet';
import { isDemo } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  return api(async () => {
    await requireRead();
    return { buses: await getFleet(), demo: isDemo(), updatedAt: new Date().toISOString() };
  });
}
