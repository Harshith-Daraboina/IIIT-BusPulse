import { api, HttpError } from '@/lib/http';
import { requireDriver } from '@/lib/access';
import { db, isDemo } from '@/lib/db';
import { rateLimit } from '@/lib/redis';
import { chatQuerySchema, chatSchema } from '@/lib/schemas';
import type { ChatMessageInfo } from '@/lib/types';
export const dynamic = 'force-dynamic';

// Chat is a per-bus message board: students post without signing in, drivers post with their device token.
export async function GET(request: Request) {
  return api(async () => {
    const { busId } = chatQuerySchema.parse({
      busId: new URL(request.url).searchParams.get('busId'),
    });
    if (isDemo()) return { messages: [] as ChatMessageInfo[] };
    const rows = await db.chatMessage.findMany({
      where: { busId, createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const messages: ChatMessageInfo[] = rows.reverse().map((row) => ({
      id: row.id,
      sender: row.sender,
      senderName: row.senderName,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    }));
    return { messages };
  });
}

export async function POST(request: Request) {
  return api(async () => {
    if (isDemo()) throw new HttpError(403, 'Chat is disabled in demo mode.');
    const input = chatSchema.parse(await request.json());
    let sender: 'STUDENT' | 'DRIVER' = 'STUDENT';
    let senderName = input.name ?? 'Student';
    if (request.headers.has('authorization')) {
      const driver = await requireDriver(request);
      if (driver.busId !== input.busId)
        throw new HttpError(403, 'This bus is not assigned to you.');
      sender = 'DRIVER';
      senderName = driver.user.name;
    } else {
      const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      await rateLimit(`chat:${address}`, 12, 60);
    }
    const message = await db.chatMessage.create({
      data: { busId: input.busId, sender, senderName, body: input.body },
    });
    return {
      message: {
        id: message.id,
        sender,
        senderName,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      } satisfies ChatMessageInfo,
    };
  });
}
