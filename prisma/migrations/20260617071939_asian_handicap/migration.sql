-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BetStatus" ADD VALUE 'HALF_WON';
ALTER TYPE "BetStatus" ADD VALUE 'HALF_LOST';
ALTER TYPE "BetStatus" ADD VALUE 'PUSH';

-- AlterEnum
ALTER TYPE "MarketType" ADD VALUE 'ASIAN_HANDICAP';

-- DropForeignKey
ALTER TABLE "ChampionBet" DROP CONSTRAINT "ChampionBet_teamId_fkey";

-- AddForeignKey
ALTER TABLE "ChampionBet" ADD CONSTRAINT "ChampionBet_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
