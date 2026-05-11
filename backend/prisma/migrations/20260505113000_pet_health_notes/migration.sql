CREATE TABLE "PetAllergy" (
  "id" TEXT NOT NULL,
  "petId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "allergen" TEXT NOT NULL,
  "severity" TEXT,
  "reaction" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PetAllergy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PetMedication" (
  "id" TEXT NOT NULL,
  "petId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dose" TEXT,
  "frequency" TEXT,
  "route" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PetMedication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PetDietNote" (
  "id" TEXT NOT NULL,
  "petId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "dietName" TEXT NOT NULL,
  "remarks" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PetDietNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PetAllergy_petId_isActive_idx" ON "PetAllergy"("petId", "isActive");
CREATE INDEX "PetAllergy_clinicId_updatedAt_idx" ON "PetAllergy"("clinicId", "updatedAt");
CREATE INDEX "PetMedication_petId_isActive_idx" ON "PetMedication"("petId", "isActive");
CREATE INDEX "PetMedication_clinicId_updatedAt_idx" ON "PetMedication"("clinicId", "updatedAt");
CREATE INDEX "PetMedication_name_idx" ON "PetMedication"("name");
CREATE INDEX "PetDietNote_petId_isActive_idx" ON "PetDietNote"("petId", "isActive");
CREATE INDEX "PetDietNote_clinicId_updatedAt_idx" ON "PetDietNote"("clinicId", "updatedAt");

ALTER TABLE "PetAllergy" ADD CONSTRAINT "PetAllergy_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PetAllergy" ADD CONSTRAINT "PetAllergy_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PetMedication" ADD CONSTRAINT "PetMedication_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PetMedication" ADD CONSTRAINT "PetMedication_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PetDietNote" ADD CONSTRAINT "PetDietNote_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PetDietNote" ADD CONSTRAINT "PetDietNote_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
