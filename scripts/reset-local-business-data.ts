import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname) || url.pathname !== "/hineni_tours") {
    throw new Error("Local reset guard rejected the configured database.");
  }

  const usersBefore = await prisma.user.findMany({ select: { id: true, email: true, passwordHash: true } });
  if (!usersBefore.length) throw new Error("No administrator exists; refusing to reset.");
  const sessionsBefore = await prisma.authSession.count();
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('User', 'AuthSession', 'AuthLoginAttempt', '_prisma_migrations')
    ORDER BY table_name
  `;
  const quoted = tables.map(({ table_name }) => `"${table_name.replaceAll('"', '""')}"`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted.join(", ")} RESTART IDENTITY CASCADE`);

  const usersAfter = await prisma.user.findMany({ select: { id: true, email: true, passwordHash: true } });
  const sessionsAfter = await prisma.authSession.count();
  if (JSON.stringify(usersBefore) !== JSON.stringify(usersAfter) || sessionsBefore !== sessionsAfter) {
    throw new Error("Authentication preservation check failed.");
  }
  console.log(JSON.stringify({ truncatedBusinessTables: tables.length, preservedUsers: usersAfter.map((u) => u.email), preservedSessions: sessionsAfter }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
