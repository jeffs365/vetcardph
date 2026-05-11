-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('OWNER', 'VETERINARIAN', 'ASSISTANT', 'RECEPTIONIST');

-- CreateEnum
CREATE TYPE "PetSex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CareIntervalUnit" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('BUG', 'IDEA', 'FEATURE_REQUEST', 'GENERAL');

-- CreateEnum
CREATE TYPE "PreventiveScheduleStatus" AS ENUM ('OPEN', 'COMPLETED_HERE', 'COMPLETED_ELSEWHERE', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ShareTokenType" AS ENUM ('EMERGENCY', 'FULL_PROFILE');

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "species" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "sex" "PetSex" NOT NULL,
    "birthDate" TIMESTAMP(3),
    "ageLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicPetAccess" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicPetAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "attendedById" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "reasonForVisit" TEXT NOT NULL,
    "findingsNotes" TEXT NOT NULL,
    "treatmentGiven" TEXT NOT NULL,
    "diagnosis" TEXT,
    "followUpNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareType" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "defaultIntervalValue" INTEGER NOT NULL,
    "defaultIntervalUnit" "CareIntervalUnit" NOT NULL,
    "defaultIntervalDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreventiveRecord" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "careTypeId" TEXT NOT NULL,
    "administeredById" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "administeredOn" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "dueDateOverridden" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreventiveRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreventiveSchedule" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "careTypeId" TEXT NOT NULL,
    "status" "PreventiveScheduleStatus" NOT NULL DEFAULT 'OPEN',
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "sourceRecordId" TEXT,
    "resolvedByRecordId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreventiveSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "summary" TEXT,
    "previousSnapshot" TEXT,
    "nextSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackSubmission" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "category" "FeedbackCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerOtp" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareToken" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "type" "ShareTokenType" NOT NULL,
    "publicToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");

-- CreateIndex
CREATE INDEX "Staff_clinicId_idx" ON "Staff"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_mobile_key" ON "Owner"("mobile");

-- CreateIndex
CREATE INDEX "Owner_fullName_idx" ON "Owner"("fullName");

-- CreateIndex
CREATE INDEX "Pet_ownerId_name_idx" ON "Pet"("ownerId", "name");

-- CreateIndex
CREATE INDEX "Pet_name_idx" ON "Pet"("name");

-- CreateIndex
CREATE INDEX "ClinicPetAccess_clinicId_idx" ON "ClinicPetAccess"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicPetAccess_petId_idx" ON "ClinicPetAccess"("petId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicPetAccess_clinicId_petId_key" ON "ClinicPetAccess"("clinicId", "petId");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_appointmentId_key" ON "Visit"("appointmentId");

-- CreateIndex
CREATE INDEX "Visit_clinicId_visitDate_idx" ON "Visit"("clinicId", "visitDate");

-- CreateIndex
CREATE INDEX "Visit_petId_visitDate_idx" ON "Visit"("petId", "visitDate");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_scheduledFor_idx" ON "Appointment"("clinicId", "scheduledFor");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_status_scheduledFor_idx" ON "Appointment"("clinicId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Appointment_petId_scheduledFor_idx" ON "Appointment"("petId", "scheduledFor");

-- CreateIndex
CREATE INDEX "CareType_clinicId_name_idx" ON "CareType"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CareType_clinicId_name_defaultIntervalValue_defaultInterval_key" ON "CareType"("clinicId", "name", "defaultIntervalValue", "defaultIntervalUnit");

-- CreateIndex
CREATE INDEX "PreventiveRecord_clinicId_nextDueDate_idx" ON "PreventiveRecord"("clinicId", "nextDueDate");

-- CreateIndex
CREATE INDEX "PreventiveRecord_petId_administeredOn_idx" ON "PreventiveRecord"("petId", "administeredOn");

-- CreateIndex
CREATE INDEX "PreventiveSchedule_clinicId_status_nextDueDate_idx" ON "PreventiveSchedule"("clinicId", "status", "nextDueDate");

-- CreateIndex
CREATE INDEX "PreventiveSchedule_petId_careTypeId_status_idx" ON "PreventiveSchedule"("petId", "careTypeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PreventiveSchedule_clinicId_petId_careTypeId_key" ON "PreventiveSchedule"("clinicId", "petId", "careTypeId");

-- CreateIndex
CREATE INDEX "AuditEntry_clinicId_createdAt_idx" ON "AuditEntry"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEntry_entityType_entityId_idx" ON "AuditEntry"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "FeedbackSubmission_clinicId_createdAt_idx" ON "FeedbackSubmission"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackSubmission_staffId_createdAt_idx" ON "FeedbackSubmission"("staffId", "createdAt");

-- CreateIndex
CREATE INDEX "OwnerOtp_mobile_expiresAt_idx" ON "OwnerOtp"("mobile", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShareToken_publicToken_key" ON "ShareToken"("publicToken");

-- CreateIndex
CREATE INDEX "ShareToken_ownerId_petId_type_idx" ON "ShareToken"("ownerId", "petId", "type");

-- CreateIndex
CREATE INDEX "ShareToken_petId_type_idx" ON "ShareToken"("petId", "type");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPetAccess" ADD CONSTRAINT "ClinicPetAccess_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPetAccess" ADD CONSTRAINT "ClinicPetAccess_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_attendedById_fkey" FOREIGN KEY ("attendedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareType" ADD CONSTRAINT "CareType_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveRecord" ADD CONSTRAINT "PreventiveRecord_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveRecord" ADD CONSTRAINT "PreventiveRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveRecord" ADD CONSTRAINT "PreventiveRecord_careTypeId_fkey" FOREIGN KEY ("careTypeId") REFERENCES "CareType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveRecord" ADD CONSTRAINT "PreventiveRecord_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveRecord" ADD CONSTRAINT "PreventiveRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveSchedule" ADD CONSTRAINT "PreventiveSchedule_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveSchedule" ADD CONSTRAINT "PreventiveSchedule_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveSchedule" ADD CONSTRAINT "PreventiveSchedule_careTypeId_fkey" FOREIGN KEY ("careTypeId") REFERENCES "CareType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveSchedule" ADD CONSTRAINT "PreventiveSchedule_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "PreventiveRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreventiveSchedule" ADD CONSTRAINT "PreventiveSchedule_resolvedByRecordId_fkey" FOREIGN KEY ("resolvedByRecordId") REFERENCES "PreventiveRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackSubmission" ADD CONSTRAINT "FeedbackSubmission_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackSubmission" ADD CONSTRAINT "FeedbackSubmission_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareToken" ADD CONSTRAINT "ShareToken_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareToken" ADD CONSTRAINT "ShareToken_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

