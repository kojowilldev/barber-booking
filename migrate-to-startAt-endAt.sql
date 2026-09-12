-- Migration: convert old (bookingDate, startTime string) columns into
-- new (startAt, endAt) DateTime columns on the Appointment table.
--
-- Run this AFTER adding the new nullable columns via `prisma migrate dev`
-- (add startAt/endAt as optional first), and BEFORE making them required
-- and dropping the old columns. Adjust column/table names if your
-- generated Postgres names differ from the Prisma model names.

-- 1. Add the new columns as nullable so existing rows don't break.
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMP;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMP;

-- 2. Backfill startAt by combining bookingDate (date part) with
--    startTime (a "HH:MM" string).
UPDATE "Appointment" a
SET "startAt" = (
  a."bookingDate"::date
  + (split_part(a."startTime", ':', 1) || ' hours')::interval
  + (split_part(a."startTime", ':', 2) || ' minutes')::interval
);

-- 3. Backfill endAt using each appointment's linked Service duration.
UPDATE "Appointment" a
SET "endAt" = a."startAt" + (s."durationMinutes" || ' minutes')::interval
FROM "Service" s
WHERE a."serviceId" = s."id";

-- 4. Sanity check before proceeding: this should return 0 rows.
--    If it doesn't, some appointments failed to backfill and need
--    manual review before you drop the old columns.
--    SELECT id FROM "Appointment" WHERE "startAt" IS NULL OR "endAt" IS NULL;

-- 5. Once you've verified the backfill (via the check above), make the
--    columns required and drop the old ones in a follow-up Prisma
--    migration (update schema.prisma, then `prisma migrate dev`):
--      - remove `bookingDate` and `startTime`
--      - change `startAt`/`endAt` from optional to required
