-- Pool dự đoán đội vô địch (parimutuel)
CREATE TABLE "ChampionBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "stake" INTEGER NOT NULL,
    "payout" INTEGER,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChampionBet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChampionBet_userId_key" ON "ChampionBet"("userId");
CREATE INDEX "ChampionBet_teamId_idx" ON "ChampionBet"("teamId");

ALTER TABLE "ChampionBet" ADD CONSTRAINT "ChampionBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChampionBet" ADD CONSTRAINT "ChampionBet_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON UPDATE CASCADE;
