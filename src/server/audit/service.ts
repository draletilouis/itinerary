import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export async function writeAuditEvent(db: Db, input: { actorId: string; action: string; entityType: string; entityId: string; previous?: unknown; next?: unknown }) {
  return db.auditEvent.create({ data: {
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    previousValues: input.previous as Prisma.InputJsonValue | undefined,
    newValues: input.next as Prisma.InputJsonValue | undefined,
  } });
}
