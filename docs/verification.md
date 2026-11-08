# Verification And Pilot Checklist

## Automated Checks

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Tests cover Haversine distance, phase-one ETA, stale signals, geofence radii, schema validation, wrong bus assignment, inactive-trip ingestion, out-of-order GPS, live key TTL, conditional history sampling, arrival deduplication keys, and previous-trip cache rejection. Database and Redis calls in API tests are mocked. They are not a substitute for cloud integration tests.

## Web Acceptance

- Desktop and mobile: MapLibre canvas renders nonblank raster tiles, stops, campus, route, and moving buses without horizontal page overflow.
- Search and filter: route/bus search, all/active/delayed, empty state, and route filter work.
- Selection: clicking a card/marker changes the selected route and stop ETA. Route links open the appropriate bus.
- Map tools: zoom, center, satellite, and fullscreen respond; attribution remains visible.
- Details: route stop selection, bus/driver details, and last GPS time remain synchronized.
- Alerts: subscriptions can be added and removed, notification messages appear, and mark-all-read works. Browser permission denial must not prevent in-app/demo subscription creation.
- History: time-window controls, CSV export, empty/error states, and horizontal table scrolling work.
- Admin: preview or real CRUD for all five entity types, required validation, editing, deletion confirmation, and assignment options work.
- Auth: production credentials succeed; wrong role cannot reach admin API/actions. Session and driver JWT expiration are handled.
- Dark mode persists and mobile navigation opens/closes. All icon controls have accessible names.

## Real Integration Gates

Before a pilot, provision isolated Neon and Upstash environments and test:

1. Driver password hashing, short-lived JWT issuer/audience verification, role revocation, and wrong-bus rejection.
2. Start-trip retries and concurrent requests; one active bus/driver trip only.
3. Real phone sends fresh coordinates near five-second intervals while the app is backgrounded.
4. Redis stores the newest location; older fixes never overwrite it. History inserts no more than once per minute.
5. Stale GPS older than 30 seconds loses ETA and live marker; stopped trips cannot ingest GPS.
6. A 100-meter stop arrival is unique per trip. A 1-km notification is unique per user/trip/stop.
7. Stop-trip during ingestion, expired lock leases, DB/Redis failure, and retry recovery. A large route/subscriber fanout must not exceed the 30-second lock lease.
8. History and analytics use real completed trips. Student subscriptions/notifications are user-isolated.
9. Active assignment edits are rejected; referenced trip history survives delete attempts.
10. Android GPS permission revocation, background restrictions, offline recovery, session expiry, and process death.
11. Retention/consent, backups, incident response, driver training, load capacity, and security review are approved by the college.

## Known Scope Limits

No road-routing ETA, timetable-based delay detection, closed-browser push delivery, offline trip-start/stop queue, automatic tracking restart after device reboot, emergency dispatch, multi-college tenancy, audit trail, or long-term analytics pagination is implemented. These are explicit follow-on requirements, not implied production capabilities.
