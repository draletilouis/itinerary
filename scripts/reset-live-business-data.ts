import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

const prisma = new PrismaClient();
const expectedProjectId = "1009e12a-c7ee-419f-8942-147014de3ffd";
const confirmation = "RESET_HINENI_PRODUCTION_KEEP_USERS";

async function main() {
  if (
    process.env.RAILWAY_PROJECT_ID !== expectedProjectId ||
    process.env.RAILWAY_ENVIRONMENT_NAME !== "production" ||
    process.env.RAILWAY_SERVICE_NAME !== "hineni" ||
    process.env.CONFIRM_LIVE_RESET !== confirmation
  ) {
    throw new Error("Live reset guard rejected this environment or confirmation.");
  }

  const usersBefore = await prisma.user.findMany({
    select: { id: true, email: true, passwordHash: true },
  });
  const sessionsBefore = await prisma.authSession.count();

  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('User', 'AuthSession', 'AuthLoginAttempt', '_prisma_migrations')
    ORDER BY table_name
  `;
  const quotedTables = tables.map(({ table_name }) => `"${table_name.replaceAll('"', '""')}"`);
  const populatedTables: Array<{ table: string; rows: number }> = [];
  for (const quotedTable of quotedTables) {
    const [{ count }] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM ${quotedTable}`,
    );
    if (count > 0n) {
      populatedTables.push({ table: quotedTable.slice(1, -1), rows: Number(count) });
    }
  }
  if (quotedTables.length === 0) {
    throw new Error("No business tables were found; refusing to continue.");
  }

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${quotedTables.join(", ")} RESTART IDENTITY CASCADE`,
  );

  const usersAfter = await prisma.user.findMany({
    select: { id: true, email: true, passwordHash: true },
  });
  const sessionsAfter = await prisma.authSession.count();
  const unchanged =
    JSON.stringify(usersBefore.sort((a, b) => a.id.localeCompare(b.id))) ===
    JSON.stringify(usersAfter.sort((a, b) => a.id.localeCompare(b.id)));
  if (!unchanged || sessionsAfter !== sessionsBefore) {
    throw new Error("Authentication preservation check failed.");
  }

  console.log(
    JSON.stringify({
      truncatedBusinessTables: tables.length,
      populatedTablesBeforeReset: populatedTables,
      preservedUserCount: usersAfter.length,
      preservedSessions: sessionsAfter,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
