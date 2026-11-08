import { api, HttpError } from '@/lib/http';
import { requireUser } from '@/lib/access';
import { db, isDemo } from '@/lib/db';
import { subscriptionSchema } from '@/lib/schemas';
export async function GET() {
  return api(async () => {
    if (isDemo()) return { stopIds: [] };
    const user = await requireUser();
    return {
      stopIds: (
        await db.subscription.findMany({ where: { userId: user.id }, select: { stopId: true } })
      ).map((item) => item.stopId),
    };
  });
}
export async function POST(request: Request) {
  return api(async () => {
    if (isDemo()) throw new HttpError(403, 'Demo alerts are stored only in your browser.');
    const user = await requireUser(['STUDENT', 'ADMIN']);
    const { stopId, enabled } = subscriptionSchema.parse(await request.json());
    if (!(await db.stop.findUnique({ where: { id: stopId } })))
      throw new HttpError(404, 'Stop not found.');
    if (enabled)
      await db.subscription.upsert({
        where: { userId_stopId: { userId: user.id, stopId } },
        create: { userId: user.id, stopId },
        update: {},
      });
    else await db.subscription.deleteMany({ where: { userId: user.id, stopId } });
    return { success: true };
  });
}
