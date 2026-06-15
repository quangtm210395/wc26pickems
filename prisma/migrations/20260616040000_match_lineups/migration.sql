-- Add lineup (đội hình) columns to Match, ingested via admin API.
ALTER TABLE "Match" ADD COLUMN "homeLineup" TEXT;
ALTER TABLE "Match" ADD COLUMN "awayLineup" TEXT;
