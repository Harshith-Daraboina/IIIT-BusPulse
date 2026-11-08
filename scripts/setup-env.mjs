import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const files = ['.env.example', '.env', '.env.local'];
const values = Object.assign(
  {},
  ...files.map((file) => (existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {})),
);
const usable = (value) =>
  Boolean(value?.trim()) && !/YOUR|USER:PASSWORD|your-domain|your-campusride/.test(value);

// Refuse to write secrets to tracked or unignored runtime files.
for (const file of ['.env', '.env.local']) {
  try {
    if (execFileSync('git', ['ls-files', '--', file], { encoding: 'utf8' }).trim()) {
      throw new Error('Tracked environment file');
    }
    execFileSync('git', ['check-ignore', '--', file], { stdio: 'ignore' });
  } catch {
    console.error(`Cannot safely configure ${file}. It must be untracked and Git-ignored.`);
    process.exit(1);
  }
}

if (!usable(values.DATABASE_URL) && usable(values.Neon_DATABASE_URL)) {
  values.DATABASE_URL = values.Neon_DATABASE_URL;
}
if (!usable(values.DIRECT_URL) && usable(values.DATABASE_URL)) {
  try {
    const url = new URL(values.DATABASE_URL);
    if (['postgres:', 'postgresql:'].includes(url.protocol) && url.hostname.endsWith('.neon.tech')) {
      url.hostname = url.hostname.replace(/-pooler(?=\.)/, '');
      url.searchParams.set('sslmode', 'require');
      values.DIRECT_URL = url.toString();
    }
  } catch {
    console.error('DATABASE_URL is malformed. Correct it locally; no credentials were displayed.');
    process.exit(1);
  }
}
for (const key of ['AUTH_SECRET', 'DRIVER_JWT_SECRET']) {
  if (!usable(values[key]) || values[key].length < 32) {
    values[key] = randomBytes(32).toString('base64url');
  }
}
for (const key of ['SEED_ADMIN_PASSWORD', 'SEED_DRIVER_PASSWORD']) {
  if (!usable(values[key]) || values[key].length < 12) {
    values[key] = randomBytes(18).toString('base64url');
  }
}
values.DEMO_MODE = 'false';
if (!usable(values.AUTH_URL)) values.AUTH_URL = 'http://localhost:3000';
if (!usable(values.NEXT_PUBLIC_MAP_TILE_URL)) {
  values.NEXT_PUBLIC_MAP_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
}
delete values.Neon_DATABASE_URL;

const required = [
  'DATABASE_URL',
  'DIRECT_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];
const missing = required.filter((key) => !usable(values[key]));
if (missing.length) {
  console.error(`Fill these settings locally before retrying: ${missing.join(', ')}`);
  process.exit(1);
}

const runtime = '# Private runtime configuration. Never commit or share this file.\n' +
  Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n';
for (const file of ['.env', '.env.local']) writeFileSync(file, runtime, { mode: 0o600 });

const example = {
  DEMO_MODE: 'true',
  NEXT_PUBLIC_MAP_TILE_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  DATABASE_URL: 'postgresql://USER:PASSWORD@YOUR-POOLER.neon.tech/college?sslmode=require',
  DIRECT_URL: 'postgresql://USER:PASSWORD@YOUR-DIRECT.neon.tech/college?sslmode=require',
  UPSTASH_REDIS_REST_URL: 'https://YOUR-REDIS.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: '',
  AUTH_SECRET: '',
  AUTH_URL: 'http://localhost:3000',
  DRIVER_JWT_SECRET: '',
  SEED_ADMIN_PASSWORD: '',
  SEED_DRIVER_PASSWORD: '',
};
writeFileSync('.env.example', '# Template only. Real values belong in ignored runtime files.\n' +
  Object.entries(example).map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
console.log('Configured .env and .env.local for real services; sanitized .env.example.');
console.log('Generated secrets and seed passwords stay in the private files.');
console.log('Next: npm run db:deploy, then npm run db:seed, then restart the application.');