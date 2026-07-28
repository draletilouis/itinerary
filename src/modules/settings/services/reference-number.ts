import type { Prisma } from "@prisma/client";

type Transaction = Prisma.TransactionClient;

export async function nextReference(
  tx: Transaction,
  sequenceName: string,
  prefix: string,
  date = new Date(),
) {
  const year = date.getUTCFullYear();
  const sequence = await tx.referenceSequence.upsert({
    where: { sequenceName_year: { sequenceName, year } },
    update: { currentValue: { increment: 1 }, prefix },
    create: { sequenceName, prefix, year, currentValue: 1 },
    select: { currentValue: true, prefix: true, year: true },
  });

  return `${sequence.prefix}-${sequence.year}-${String(sequence.currentValue).padStart(4, "0")}`;
}
