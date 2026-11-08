import { api } from '@/lib/http';
import { requireUser } from '@/lib/access';
import { db, isDemo } from '@/lib/db';
export async function GET() {
  return api(async () => {
    if (isDemo()) return { notifications: [] };
    const user = await requireUser();
    return {
      notifications: await db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    };
  });
}
export async function PATCH() {
  return api(async () => {
    const user = await requireUser();
    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return { success: true };
  });
}
