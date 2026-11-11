import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { z } from 'zod';

const db = new PrismaClient();
const rotate = process.argv.includes('--rotate');
const email = z.email().parse(process.env.SEED_ADMIN_EMAIL ?? 'admin@iiitdwd.ac.in');
const password = rotate ? randomBytes(24).toString('base64url') : process.env.SEED_ADMIN_PASSWORD;
const files = ['.env', '.env.local'].filter(existsSync);

try {
  z.string().min(12).max(128).parse(password);
  if (rotate) {
    if (!files.includes('.env')) throw new Error('Create a private .env file first.');
    for (const file of files) {
      if (execFileSync('git', ['ls-files', '--', file], { encoding: 'utf8' }).trim()) {
        throw new Error('Environment files must not be tracked by Git.');
      }
      execFileSync('git', ['check-ignore', '--', file], { stdio: 'ignore' });
    }
  }

  await db.user.upsert({
    where: { email },
    create: { email, name: 'IIIT Dharwad Transport Admin', role: 'ADMIN', password: await hash(password, 12) },
    update: { role: 'ADMIN', password: await hash(password, 12) },
  });

  if (rotate) {
    for (const file of files) {
      const values = parseEnv(readFileSync(file, 'utf8'));
      values.SEED_ADMIN_PASSWORD = password;
      const content = '# Private runtime configuration. Never commit or share this file.\n' +
        Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n';
      writeFileSync(file, content, { mode: 0o600 });
    }
  }
  console.log(`Admin account ready: ${email}`);
  console.log(rotate
    ? 'A new password was saved as SEED_ADMIN_PASSWORD in your private environment files. No password was printed.'
    : 'The admin password now matches SEED_ADMIN_PASSWORD.');
} catch (error) {
  console.error(error instanceof z.ZodError
    ? 'A valid admin email and password of 12-128 characters are required.'
    : `Admin setup failed (${error.code ?? 'SETUP_ERROR'}). Check database access and private environment files.`);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}