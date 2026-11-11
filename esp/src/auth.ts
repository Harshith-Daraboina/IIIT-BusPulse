import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { db, isDemo } from '@/lib/db';
import { rateLimit } from '@/lib/redis';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (isDemo()) return null;
        const input = z
          .object({
            email: z.email().transform((value) => value.toLowerCase()),
            password: z.string().min(8).max(128),
          })
          .safeParse(credentials);
        if (!input.success) return null;
        await rateLimit(`login:${input.data.email}`, 10, 900);
        const user = await db.user.findUnique({ where: { email: input.data.email } });
        if (!user || user.role !== 'ADMIN' || !(await compare(input.data.password, user.password))) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id);
      session.user.role = token.role as 'ADMIN' | 'DRIVER' | 'STUDENT';
      return session;
    },
  },
});
