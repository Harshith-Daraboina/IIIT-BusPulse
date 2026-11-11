# IIIT BusPulse - Smart College Bus Tracking System

**IIIT BusPulse** is a final-year B.Tech/MCA project for IIIT Dharwad transportation: a Next.js student/admin workspace, authenticated GPS APIs, and a native Kotlin driver app.

The campus location uses IIIT Dharwad's Ittigatti campus coordinates from OpenStreetMap. The only active route is IIIT Dharwad Campus → Shivaji Hostel → Transit Hostel. Older routes are archived and no longer assigned to buses. Hostel GPS coordinates remain unset until verified, so those stops do not produce map geometry or ETAs. Confirm the road sequence and surveyed locations before operational use. Timetable departure times from the supplied image are not yet modeled. Branding changes do not rename existing seed accounts or authentication identifiers.

Students can open tracking, routes, ETA, and trip history without signing in. Arrival subscriptions and messages stay in their browser, and require the app to remain open. Only the web admin console requires an ADMIN account; Android drivers still authenticate before starting trips or sending GPS. Admin authentication is not bypassed in demo mode.

## Run The Demonstration

```powershell
npm install
npm run dev
```

Open **http://localhost:3000**. The included ignored `.env.local` enables `DEMO_MODE=true`; no cloud credentials are necessary. For a fresh checkout, create an ignored `.env.local` containing that line. Demo buses move on simulated Hubballi routes. Every screen labels demo data. Admin edits are temporary previews, not database writes. Real login and driver GPS writes are disabled in demo mode.

## Features

- Student tracking: six demo buses, search/status/route filters, live MapLibre raster map, route polylines, selectable stops, college marker, speed, ETA, zoom/center/satellite/fullscreen, and driver details.
- Three-second React Query polling, loading states, error recovery, responsive mobile navigation, accessible icon controls, and persistent dark mode.
- Route directory, selected-stop arrival subscriptions, in-app notifications, trip history windows, and CSV export.
- Admin console: overview, running trips, buses, routes, stops, drivers, users, trip history, and recent transport analytics.
- Auth.js credentials with bcrypt and JWT sessions; separate audience-restricted driver JWTs; role and bus assignment validation on the server.
- Upstash Redis live locations with TTL, stale GPS detection, rate limits, and per-bus locks.
- Prisma/Neon trip history sampled every 60 seconds, 100-meter arrivals, and unique 1-km subscription alerts.
- Kotlin/Compose MVVM app with secure Android Keystore tokens, FusedLocationProviderClient foreground service, requested five-second updates, offline retry, and confirmed trip stop.

## Stack

| Layer        | Technology                                                             |
| ------------ | ---------------------------------------------------------------------- |
| Web          | Next.js 15 App Router, React 19, TypeScript                            |
| UI           | Tailwind CSS 4, Shadcn-style Radix primitives, Lucide, DM Sans/Manrope |
| Client state | TanStack React Query                                                   |
| Maps         | MapLibre GL, OpenStreetMap raster tiles, Esri imagery                  |
| Server       | Next.js Route Handlers and Server Actions, Zod                         |
| Auth         | Auth.js JWT sessions, bcrypt, jose device JWTs                         |
| Persistence  | Prisma 6, Neon PostgreSQL, Upstash Redis                               |
| Android      | Kotlin, MVVM, Jetpack Compose, Retrofit, FusedLocationProviderClient   |
| Verification | Vitest, TypeScript, ESLint, production build, GitHub Actions           |

## Pages

| Student                          | Admin                                    |
| -------------------------------- | ---------------------------------------- |
| `/` live tracking                | `/admin` overview                        |
| `/routes` route directory        | `/admin/routes` route CRUD               |
| `/history` timings               | `/admin/stops` stop CRUD                 |
| `/alerts` subscriptions/messages | `/admin/drivers` drivers and assignments |
| `/login` college account         | `/admin/buses` vehicle management        |
|                                  | `/admin/users` accounts and roles        |
|                                  | `/admin/history` recent trips            |

## Folder Structure

```text
src/
  app/
    api/
      auth/[...nextauth]/   Auth.js session handlers
      buses/ eta/ history/ Student fleet/timing APIs
      subscriptions/       Own stop subscriptions
      notifications/       Own in-app messages
      driver/              Device login and assignment
      trips/start/ stop/   Driver trip lifecycle
      location/            GPS ingestion and geofences
      admin/               Role-protected admin reads
    admin/
      [[...section]]/      Admin routes
      actions.ts           Validated CRUD Server Actions
    routes/ history/ alerts/ login/
    globals.css            Responsive light/dark design system
  components/
    dashboard.tsx          Student workspace and state
    admin-dashboard.tsx    Admin CRUD and analytics
    bus-map.tsx            MapLibre lifecycle and live markers
    shell.tsx              Navigation and account controls
    providers.tsx          Query/session providers
    ui/                    Shadcn-style Button/Dialog primitives
  lib/                     Data services, validation, geo, Redis, access
  types/                   Auth.js type augmentation
  auth.ts                  Credentials and session configuration
prisma/
  schema.prisma            PostgreSQL models and constraints
  migrations/              Initial SQL migration
  seed.ts                  Idempotent fleet/account seed
android/                   Native driver application
docs/                      Architecture, diagrams, API, deployment, verification
public/bus.jpg             Bundled transit photograph
.github/workflows/ci.yml    Web quality gates
```

## Real Services

Use the server variables from `.env.example`, set `DEMO_MODE=false`, provision Neon/Upstash, apply `npx prisma migrate deploy`, and seed strong initial credentials with `npm run db:seed`. Seeded admin email is `admin@iiitdwd.ac.in`; driver IDs are `DRV001` through `DRV006`. No passwords are hardcoded. Create student accounts using the admin users screen. Review seed coordinates, IDs, license data, and phone numbers before use.

Prisma CLI/seed commands need environment variables supplied through your shell or an ignored `.env`; they do not automatically load `.env.local`. See the full [deployment guide](docs/deployment.md) for Vercel, Neon, Upstash, Android SDK, and secret handling.

## Verification

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Tests cover distance/ETA, geofencing, GPS validation/ownership, history sampling, arrival deduplication, and stale/previous-trip cache behavior. API tests mock database/Redis calls. See [verification and pilot gates](docs/verification.md).

## Documentation

- [System architecture, ER diagram, and sequence diagrams](docs/architecture.md)
- [API contracts and security](docs/api.md)
- [Deployment and Android build instructions](docs/deployment.md)
- [Native Android project](android/README.md)

## Scope And Readiness

This is a runnable project implementation with production-oriented boundaries, **not a certified operational college deployment**. Live Neon/Upstash integration requires service credentials. Android compilation and device testing require Android Studio/JDK/SDK, unavailable in the current environment.

ETA is a Haversine-based approximation. Route lines connect stops and are not road-routed. Real `ON_TIME` means fresh GPS, not timetable adherence; simulated delays are demo-only. Real notifications are polled in-app, not delivered to closed browsers. Demo notifications/subscriptions are browser-local. Multi-college tenancy, push delivery, audit logging, offline trip queues, and automatic tracking restart are outside this version.

Review privacy/consent, retention, route geometry, timetable modeling, concurrency/load limits, backups, and the supervised pilot checklist before a real college rollout. Do not use this project for emergency dispatch.

## Asset Attribution

Basemap data/tiles: OpenStreetMap contributors; optional imagery: Esri World Imagery (also attributed in-map). Set `NEXT_PUBLIC_MAP_TILE_URL` to a licensed raster tile service for a large deployment. The bundled photograph was downloaded from Unsplash photo `1570125909232-eb263c188f7e`; replace it with a college-owned bus photograph for institutional branding. Check map-provider terms and quotas before production use.
