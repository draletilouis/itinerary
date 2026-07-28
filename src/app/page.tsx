import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if ((await prisma.user.count()) === 0) redirect("/setup");
  redirect("/dashboard");
}
