import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

const prisma = new PrismaClient();
const expectedProjectId = "1009e12a-c7ee-419f-8942-147014de3ffd";

async function main() {
  if (
    process.env.RAILWAY_PROJECT_ID !== expectedProjectId ||
    process.env.RAILWAY_ENVIRONMENT_NAME !== "production" ||
    process.env.RAILWAY_SERVICE_NAME !== "hineni"
  ) {
    throw new Error("Live reset guard rejected this environment.");
  }

  const usersBefore = await prisma.user.findMany({
    select: { id: true, email: true, passwordHash: true },
  });
  if (!usersBefore.length) {
    throw new Error("No login users exist; refusing to reset production data.");
  }

  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('User', '_prisma_migrations')
    ORDER BY table_name
  `;
  const quotedTables = tables.map(({ table_name }) => `"${table_name.replaceAll('"', '""')}"`);
  if (quotedTables.length === 0) {
    throw new Error("No resettable tables were found; refusing to continue.");
  }

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${quotedTables.join(", ")} RESTART IDENTITY CASCADE`,
  );

  const usersAfter = await prisma.user.findMany({
    select: { id: true, email: true, passwordHash: true },
  });
  const authSessionsAfter = await prisma.authSession.count();
  const authAttemptsAfter = await prisma.authLoginAttempt.count();
  const unchanged =
    JSON.stringify(usersBefore.sort((a, b) => a.id.localeCompare(b.id))) ===
    JSON.stringify(usersAfter.sort((a, b) => a.id.localeCompare(b.id)));
  if (!unchanged || authSessionsAfter !== 0 || authAttemptsAfter !== 0) {
    throw new Error("Login credential preservation check failed.");
  }

  console.log(
    JSON.stringify({
      truncatedTables: tables.length,
      preservedLoginUsers: usersAfter.map(({ email }) => email),
      clearedSessions: authSessionsAfter,
      clearedLoginAttempts: authAttemptsAfter,
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
