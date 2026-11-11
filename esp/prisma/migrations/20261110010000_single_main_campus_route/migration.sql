BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Trip" WHERE "status" = 'ACTIVE') THEN
    RAISE EXCEPTION 'Stop active trips before consolidating routes.';
  END IF;
END $$;

UPDATE "Route"
SET "name" = 'Archived: ' || "name"
WHERE "id" <> 'R02' AND "name" NOT LIKE 'Archived:%';

UPDATE "Bus"
SET "routeId" = 'R02'
WHERE "routeId" <> 'R02';

COMMIT;