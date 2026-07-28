"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/server/db/prisma";
import { verifyPassword } from "@/server/auth/password";
import { createSession, revokeCurrentSession } from "@/server/auth/session";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const DUMMY_PASSWORD_HASH =
  "scrypt$00000000000000000000000000000000$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();
  const ipAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    undefined;
  const userAgent = requestHeaders.get("user-agent") ?? undefined;
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);

  const failedAttempts = await prisma.authLoginAttempt.count({
    where: { email, successful: false, attemptedAt: { gte: since } },
  });
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    redirect("/login?error=Too+many+attempts.+Try+again+in+15+minutes");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  await prisma.authLoginAttempt.create({
    data: { email, successful: Boolean(valid && user?.status === "ACTIVE"), ipAddress },
  });

  if (!valid || !user || user.status !== "ACTIVE") {
    redirect("/login?error=Invalid+email+or+password");
  }

  await createSession(user.id, { ipAddress, userAgent });
  if (user.mustChangePassword) redirect("/change-password");
  redirect("/dashboard");
}

export async function signOutAction() {
  await revokeCurrentSession();
  redirect("/login");
}
