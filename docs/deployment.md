# Deployment Guide

## Prepared Environment

`npm run env:setup` transfers existing configuration into Git-ignored `.env` and `.env.local`, generates independent authentication secrets and initial seed passwords, and sanitizes `.env.example`. It sets `DEMO_MODE=false`. No database changes or cloud deployment are performed by this command. A derived Neon direct hostname still needs to match the direct connection supplied by your Neon dashboard.

After configuration, initialize the database explicitly:

```powershell
npm run db:deploy
npm run db:seed
```

These commands change the configured database: deploy applies migrations and seed inserts sample fleet/accounts without resetting existing passwords. Use a new development/pilot Neon database. Read the generated admin password directly from your private runtime file; do not share it in chat. Restart your local server after configuration changes.

For Vercel, import the private runtime variables through **Project Settings > Environment Variables** for Production. Exclude `SEED_ADMIN_PASSWORD` and `SEED_DRIVER_PASSWORD` after seeding. Set `AUTH_URL` to the actual HTTPS deployment URL, not localhost, and redeploy. Keep all secrets server-only; only the map tile URL uses `NEXT_PUBLIC_`. Use separate service credentials for Preview deployments.

## Local Demonstration

Requirements: Node.js 22.18+ and npm. For a credentials-free demo, set `DEMO_MODE=true` in your ignored `.env.local`. The environment setup command instead enables real-service mode.

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. Demo mode shows six buses, four routes, moving GPS markers, arrival estimates, history, alerts, and temporary admin previews. There is no demo password and demo mode cannot authenticate against real accounts.

## Neon PostgreSQL

1. Create a Neon project near your Vercel deployment region. Enable backups/PITR appropriate for your plan.
2. Set `DATABASE_URL` to the pooled connection URL, including `sslmode=require`.
3. Set `DIRECT_URL` to the direct, non-pooled connection URL, including `sslmode=require`.
4. Apply the checked-in initial migration with `npx prisma migrate deploy`. Future changes: use `npx prisma migrate dev --name meaningful_name` against a development branch, commit the generated migration, then run `migrate deploy` in your release process. Never run `db push` against a database whose history must be preserved.
5. Set `SEED_ADMIN_PASSWORD` and `SEED_DRIVER_PASSWORD` to strong independent initial passwords (12+ characters), then run `npm run db:seed` against a development/pilot database. The script will not reset existing passwords. Sign in as `admin@iiitdwd.ac.in`, review every seeded route/coordinate, and create student accounts under `/admin/users`.
6. Seeded driver IDs are `DRV001` through `DRV006`. Immediately set distinct passwords for all drivers under user management. Remove seed-password environment variables afterward. Do not use sample driver phone numbers or license numbers for a real fleet.

For local production integration, use the variables listed in `.env.example`, set `DEMO_MODE=false`, and restart the server. `npm run env:setup` creates both runtime files. Prisma loads `.env`; `npm run db:seed` explicitly loads `.env` through Node. Next.js gives `.env.local` precedence over `.env`, so keep both copies synchronized if you edit configuration manually. Never commit either file.

## Upstash Redis

1. Create an Upstash Redis database in a nearby region.
2. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to the server environment.
3. Redis stores `bus:*` GPS keys with a 90-second TTL, temporary `lock:bus:*` keys, and `limit:*` counters. Credentials remain server-only.
4. Size request quotas for polling and GPS updates. Measure latency from Vercel; monitor quota exhaustion and stale GPS rates.

## Vercel

The demo map defaults to `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Respect OpenStreetMap's tile usage policy: no bulk downloads, offline prefetch, or unrestricted high-volume use. Before an operational deployment, configure `NEXT_PUBLIC_MAP_TILE_URL` with a licensed raster tile provider, keep visible attribution accurate, and rebuild (Next.js embeds public variables at build time). Optional satellite imagery uses Esri World Imagery; review its terms as well.

1. Push this project to a private Git repository and import it into Vercel as a Next.js application. Do not commit `.env.local`.
2. Use Node.js 22.x or a newer supported Node runtime. Install command: `npm ci`. Build command: `npm run build`. The `postinstall` hook generates Prisma Client.
3. Configure `DEMO_MODE=false`, `DATABASE_URL`, `DIRECT_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `AUTH_SECRET`, `DRIVER_JWT_SECRET`, and `AUTH_URL=https://your-domain.example` in Vercel.
4. Generate the two independent secrets locally: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Repeat for the second secret. Store directly in the provider secret manager; do not paste secrets into chat or source control.
5. Run migrations as a controlled release step before deploying application changes. Do not run schema mutation during every build or request.
6. Use isolated Neon branches/Redis databases and separate auth secrets for previews. Never point a public preview at the live college database.
7. Deploy, test Auth.js login, assign a driver and bus, start an Android trip, verify Redis freshness and PostgreSQL sampling, and confirm trip stop clears the bus key.

A public demonstration deployment can explicitly use `DEMO_MODE=true` and no cloud secrets. It will not support real authentication or driver GPS uploads. Never enable demo mode for the operational college deployment.

## Android Studio

1. Install Android Studio with JDK 17, Android SDK 35, and a supported Gradle environment. Open the `android` directory as a project.
2. Set `API_BASE_URL` in `android/gradle.properties` to your HTTPS Vercel origin, including its trailing slash. This is an origin, not a secret.
3. The repository contains source and Gradle build configuration, not a generated wrapper binary. If required, generate and commit a standard wrapper with installed Gradle: `gradle wrapper --gradle-version 8.9`. Then `./gradlew assembleDebug` (Windows: `.\gradlew.bat assembleDebug`). Android Studio may download the required tooling during sync.
4. For a local emulator, use `http://10.0.2.2:3000/`; for a real phone, use the development machine's reachable LAN address. Only the debug manifest permits HTTP. Backend must be configured with `DEMO_MODE=false` and real service credentials for driver login/writes.
5. Sign in with an assigned driver ID/password. Grant precise foreground location permission, enable device GPS, and start a trip while the app is visible. The foreground notification keeps location collection running while navigating away.
6. Target Android 14/15 devices and test foreground-service restrictions, permission revocation, battery optimization, loss of network, expired tokens, and process termination. Five seconds is the requested interval, not an OS guarantee.
7. After process death the app does not silently restart tracking. Sign in/refresh the assignment and explicitly resume GPS for the active trip. Stale data is withheld from students until a fresh fix arrives.
8. For release: configure a private signing key through Android Studio/CI, increment version codes, use HTTPS, and distribute through the college's managed device policy or Play Console. Do not commit signing keys/passwords.

No APK was built in this environment because Java, Gradle, Android SDK, and ADB were unavailable. Validate native compilation and physical-device behavior before distribution.

## Operational Configuration

- Survey coordinates, actual road geometry, routes, stop order, registered vehicles, licensed drivers, and university destination before deployment.
- Decide retention/consent policy for location history and contact details. Add a scheduled archival/deletion job, access auditing, and backup restoration drills.
- Monitor authentication failures, GPS freshness, rate limits, Redis/DB errors, function duration, and notification generation.
- Real notifications are in-app only; implement Web Push/FCM for closed-browser delivery.
- Add timetable data before interpreting status as schedule adherence. ETA is a phase-one straight-line estimate.
- Run a supervised pilot, load tests, dependency security review, and the checklist in `verification.md` before general college rollout.
