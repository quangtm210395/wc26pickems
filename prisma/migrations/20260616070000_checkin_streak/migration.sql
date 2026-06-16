-- Check-in streak
ALTER TABLE "User" ADD COLUMN "checkinStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastCheckinAt" TIMESTAMP(3);
