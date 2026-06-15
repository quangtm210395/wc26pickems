-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'REPAID');

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "principal" INTEGER NOT NULL,
    "interestPct" INTEGER NOT NULL DEFAULT 10,
    "outstanding" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Loan_userId_status_idx" ON "Loan"("userId", "status");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
