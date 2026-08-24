-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EntryKind" AS ENUM ('JOURNAL', 'THOUGHT');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('IMAGE', 'AUDIO');

-- CreateEnum
CREATE TYPE "TranscriptStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "TrackerCadence" AS ENUM ('DAILY', 'OCCASIONAL');

-- CreateEnum
CREATE TYPE "TrackerLogType" AS ENUM ('BINARY', 'NUMBER', 'TEXT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "EntryKind" NOT NULL DEFAULT 'JOURNAL',
    "title" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entryDate" DATE,
    "priorEntryDate" DATE,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileName" TEXT,
    "durationSeconds" INTEGER,
    "transcriptStatus" "TranscriptStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "transcript" TEXT,
    "transcriptError" TEXT,
    "entryId" TEXT,
    "trackerLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tracker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cadence" "TrackerCadence" NOT NULL DEFAULT 'DAILY',
    "logType" "TrackerLogType" NOT NULL,
    "unit" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackerLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "boolValue" BOOLEAN,
    "numValue" DOUBLE PRECISION,
    "textValue" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackerLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Entry_userId_entryDate_idx" ON "Entry"("userId", "entryDate");

-- CreateIndex
CREATE INDEX "Entry_userId_createdAt_idx" ON "Entry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Attachment_entryId_idx" ON "Attachment"("entryId");

-- CreateIndex
CREATE INDEX "Attachment_trackerLogId_idx" ON "Attachment"("trackerLogId");

-- CreateIndex
CREATE INDEX "Attachment_userId_transcriptStatus_idx" ON "Attachment"("userId", "transcriptStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_entryId_key" ON "Reminder"("entryId");

-- CreateIndex
CREATE INDEX "Reminder_userId_remindAt_idx" ON "Reminder"("userId", "remindAt");

-- CreateIndex
CREATE INDEX "Tracker_userId_archivedAt_idx" ON "Tracker"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "TrackerLog_trackerId_logDate_idx" ON "TrackerLog"("trackerId", "logDate");

-- CreateIndex
CREATE INDEX "TrackerLog_userId_logDate_idx" ON "TrackerLog"("userId", "logDate");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_trackerLogId_fkey" FOREIGN KEY ("trackerLogId") REFERENCES "TrackerLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tracker" ADD CONSTRAINT "Tracker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerLog" ADD CONSTRAINT "TrackerLog_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

