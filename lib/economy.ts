import { prisma } from "@/lib/prisma";
import type { Prisma, TxType } from "@prisma/client";

type Client = Prisma.TransactionClient | typeof prisma;

export type CreditInput = {
  userId: string;
  type: TxType;
  amount: number; // +/- điểm
  refType?: string;
  refId?: string;
  note?: string;
};

/**
 * Ghi 1 giao dịch vào ledger + cập nhật số dư cache (User.balance).
 * Truyền tx client (trong $transaction) để đảm bảo atomic với thao tác khác.
 * Trả về số dư sau giao dịch.
 */
export async function credit(client: Client, input: CreditInput): Promise<number> {
  const user = await client.user.update({
    where: { id: input.userId },
    data: { balance: { increment: input.amount } },
    select: { balance: true },
  });
  await client.walletTransaction.create({
    data: {
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      balanceAfter: user.balance,
      refType: input.refType,
      refId: input.refId,
      note: input.note,
    },
  });
  return user.balance;
}

export async function getBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  return u?.balance ?? 0;
}
