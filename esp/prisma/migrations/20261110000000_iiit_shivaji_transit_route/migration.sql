BEGIN;

DO $$
DECLARE
  legacy_name TEXT;
  legacy_source TEXT;
  legacy_destination TEXT;
  legacy_color TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Trip" AS trip
    JOIN "Bus" AS bus ON bus."id" = trip."busId"
    WHERE bus."routeId" = 'R02' AND trip."status" = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Stop active R02 trips before changing the route.';
  END IF;

  SELECT "name", "source", "destination", "color"
  INTO legacy_name, legacy_source, legacy_destination, legacy_color
  FROM "Route"
  WHERE "id" = 'R02';

  IF FOUND THEN
    INSERT INTO "Route" ("id", "name", "source", "destination", "color")
    VALUES (
      'R02-LEGACY-20261110',
      'Archived: ' || legacy_name,
      legacy_source,
      legacy_destination,
      legacy_color
    )
    ON CONFLICT ("id") DO NOTHING;

    UPDATE "Stop"
    SET "routeId" = 'R02-LEGACY-20261110'
    WHERE "routeId" = 'R02';
  END IF;
END $$;

INSERT INTO "Route" ("id", "name", "source", "destination", "color")
VALUES (
  'R02',
  'IIIT Dharwad Campus - Shivaji Hostel - Transit Hostel',
  'IIIT Dharwad Campus',
  'Transit Hostel',
  '#2864ea'
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "source" = EXCLUDED."source",
  "destination" = EXCLUDED."destination",
  "color" = EXCLUDED."color";

INSERT INTO "Stop" ("id", "routeId", "stopName", "latitude", "longitude", "sequenceNumber")
VALUES
  ('R02-HOSTEL-S1', 'R02', 'IIIT Dharwad Campus', 15.3919083, 75.0247764, 1),
  ('R02-HOSTEL-S2', 'R02', 'Shivaji Hostel', NULL, NULL, 2),
  ('R02-HOSTEL-S3', 'R02', 'Transit Hostel', NULL, NULL, 3)
ON CONFLICT ("id") DO UPDATE SET
  "routeId" = EXCLUDED."routeId",
  "stopName" = EXCLUDED."stopName",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "sequenceNumber" = EXCLUDED."sequenceNumber";

COMMIT;