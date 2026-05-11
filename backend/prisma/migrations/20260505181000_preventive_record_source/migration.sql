CREATE TYPE "PreventiveRecordSource" AS ENUM ('CLINIC_RECORDED', 'HISTORICAL_BOOKLET');

ALTER TABLE "PreventiveRecord"
ADD COLUMN "sourceType" "PreventiveRecordSource" NOT NULL DEFAULT 'CLINIC_RECORDED',
ADD COLUMN "sourceNote" TEXT;
