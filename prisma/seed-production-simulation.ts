import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const keepNames = [
      "Bwindi Impenetrable National Park",
      "Jinja and the River Nile",
      "Queen Elizabeth National Park",
    ];
    const extras = await prisma.destination.findMany({
      where: { name: { notIn: keepNames } },
      select: { id: true },
    });
    const ids = extras.map((item) => item.id);
    await prisma.activity.deleteMany({ where: { destinationId: { in: ids } } });
    await prisma.travelRoute.deleteMany({
      where: {
        OR: [
          { originId: { in: ids } },
          { destinationId: { in: ids } },
        ],
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  await import("./seed-simulation");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
