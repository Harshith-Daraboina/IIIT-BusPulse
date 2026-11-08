# API Reference

All endpoints return JSON. Error bodies have `{ "error": "..." }`; Zod validation errors can also include `issues`. Authenticated reads are uncached. Device JWTs are only accepted by driver endpoints, not by student/admin APIs.

| Endpoint                           | Method   | Access              | Purpose                                |
| ---------------------------------- | -------- | ------------------- | -------------------------------------- |
| `/api/auth/[...nextauth]`          | GET/POST | Credentials         | Auth.js cookie-based JWT sessions      |
| `/api/buses`                       | GET      | Any signed-in user  | Fleet metadata and Redis GPS           |
| `/api/eta?busId=BUS001&stopId=S04` | GET      | Any signed-in user  | Selected-stop phase-one ETA            |
| `/api/history?days=7`              | GET      | Any signed-in user  | Recent trips; `days` is 1, 7, or 30    |
| `/api/subscriptions`               | GET      | Signed-in user      | Own stop IDs                           |
| `/api/subscriptions`               | POST     | STUDENT/ADMIN       | `{stopId, enabled}` upsert/delete      |
| `/api/notifications`               | GET      | Signed-in user      | Most recent 50 own messages            |
| `/api/notifications`               | PATCH    | Signed-in user      | Mark own notifications read            |
| `/api/driver/login`                | POST     | Driver credentials  | Issue short-lived device JWT           |
| `/api/driver/assignment`           | GET      | Driver JWT          | Assigned bus/route and active trip     |
| `/api/trips/start`                 | POST     | Assigned driver JWT | Idempotently start owned bus trip      |
| `/api/trips/stop`                  | POST     | Assigned driver JWT | Idempotently complete owned bus trip   |
| `/api/location`                    | POST     | Assigned driver JWT | Ingest GPS, history, geofences, alerts |
| `/api/admin?entity=buses`          | GET      | ADMIN               | Admin records and form options         |
| `/api/admin?entity=analytics`      | GET      | ADMIN               | Recent transport analytics             |

Admin writes use `saveRecord(entity, id, input)` and `deleteRecord(entity, id)` Server Actions. Every invocation checks the current database role. Entities: `buses`, `routes`, `stops`, `drivers`, `users`. Active trip assignments cannot be changed. Existing trip relations restrict destructive deletion. Own-admin deletion/demotion is blocked. User passwords are bcrypt-hashed and never returned.

## Driver Login

```http
POST /api/driver/login
Content-Type: application/json

{"driverId":"DRV001","password":"YOUR_DRIVER_PASSWORD"}
```

```json
{
  "token": "SIGNED_JWT",
  "expiresIn": 28800,
  "driver": { "id": "DRV001", "name": "Ramesh Patil" },
  "bus": {
    "id": "BUS001",
    "busNumber": "01",
    "route": { "id": "R01", "name": "Vidyanagar Express", "stops": [] }
  }
}
```

Use `Authorization: Bearer SIGNED_JWT` for assignment, GPS, and trip requests. Start/stop body: `{ "busId": "BUS001" }`. Login examples are abbreviated; the API includes the full assigned route, stops, and bus fields.

## GPS Request

```json
{
  "busId": "BUS001",
  "latitude": 15.458,
  "longitude": 75.007,
  "speed": 42,
  "heading": 120,
  "timestamp": "2026-11-08T10:00:00Z"
}
```

Speed is km/h, heading is degrees, timestamp is UTC ISO-8601. Replace the example timestamp with the actual fix time; requests must be within 30 seconds of server time. Latitude is -90..90, longitude -180..180, speed 0..160, heading 0..360. Extra fields are rejected. Out-of-order fixes return `{ "accepted": false, "reason": "Older location ignored" }` without overwriting Redis. Active trips are required.

## ETA Response

```json
{ "eta": "8 mins", "minutes": 8, "estimated": true }
```

No fresh GPS: `{ "eta": null, "minutes": null, "estimated": true }`. Within 100 meters: `eta` is `Arriving`, `minutes` is `0`.

## Status And Security

- 400: malformed payload, coordinates, timestamp, or query parameter.
- 401: missing/expired session or device token.
- 403: wrong role, wrong assignment, or disabled demo write.
- 404: unknown bus/stop.
- 409: trip/record conflict or bus lock held. Retry GPS on the next interval.
- 429: rate limit. Driver API is capped at 30 requests/minute per driver, logins at 10/15 minutes per account ID.
- 503: missing cloud configuration or service outage.

Auth.js manages CSRF-protected credential sign-in and HTTP-only cookies. Device JWTs use HS256, 8-hour expiry, issuer `campusride`, audience `driver`; role and assignment are revalidated from the database. Use independent 32-byte-or-longer secrets. Require HTTPS. Do not put DB, Redis, JWT, or auth secrets in `NEXT_PUBLIC_*` variables or the APK.

Account-based rate limiting protects known IDs; add provider/WAF IP limits for high-volume anonymous enumeration. Tokens are not individually revoked, but changing the user role or removing the driver profile takes effect on the next request. The project is not an emergency/safety-critical dispatch system.

Demo GETs are public and return clearly identified simulated records. Demo driver writes, persistent admin writes, real subscription writes, and credential sign-in are disabled.
