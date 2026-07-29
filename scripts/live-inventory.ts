import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

const prisma = new PrismaClient();

async function main() {
  const environment = {
    project: process.env.RAILWAY_PROJECT_ID,
    projectName: process.env.RAILWAY_PROJECT_NAME,
    environment: process.env.RAILWAY_ENVIRONMENT_NAME,
    service: process.env.RAILWAY_SERVICE_NAME,
  };

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
    },
    orderBy: { email: "asc" },
  });

  const delegates = Object.entries(prisma).filter(
    ([name, value]) =>
      !name.startsWith("$") &&
      typeof value === "object" &&
      value !== null &&
      "count" in value,
  );
  const counts = Object.fromEntries(
    await Promise.all(
      delegates.map(async ([name, delegate]) => [
        name,
        await (delegate as { count: () => Promise<number> }).count(),
      ]),
    ),
  );

  console.log(JSON.stringify({ environment, users, counts }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
