CREATE TYPE "CareCategory" AS ENUM ('VACCINATION', 'DEWORMING', 'HEARTWORM', 'OTHER');

ALTER TABLE "CareType"
  ADD COLUMN "category" "CareCategory" NOT NULL DEFAULT 'OTHER';

UPDATE "CareType"
SET "category" = 'VACCINATION'
WHERE lower("name") ~ '(vaccine|vaccination|rabies|dhpp|dhlpp|parvo|distemper|lepto|leptospirosis|bordetella|kennel cough|corona|5-in-1|5 in 1)';

UPDATE "CareType"
SET "category" = 'DEWORMING'
WHERE lower("name") ~ '(deworm|worm|prazi|pyrantel|anthelmintic)';

UPDATE "CareType"
SET "category" = 'HEARTWORM'
WHERE lower("name") ~ '(heartworm)';

ALTER TABLE "PreventiveRecord"
  ADD COLUMN "productName" TEXT,
  ADD COLUMN "manufacturer" TEXT,
  ADD COLUMN "lotNumber" TEXT,
  ADD COLUMN "serialNumber" TEXT,
  ADD COLUMN "expiryDate" TIMESTAMP(3);

CREATE INDEX "CareType_clinicId_category_name_idx" ON "CareType"("clinicId", "category", "name");
