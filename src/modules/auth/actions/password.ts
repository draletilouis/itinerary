"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";

export async function changePasswordAction(formData: FormData) {
  const user = await requireCurrentUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    redirect("/change-password?error=Current+password+is+incorrect");
  }
  if (newPassword !== confirmPassword) {
    redirect("/change-password?error=New+passwords+do+not+match");
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(newPassword);
  } catch (error) {
    redirect(
      `/change-password?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Password is not valid.",
      )}`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });
    await writeAuditEvent(tx, {
      actorId: user.id,
      action: "user.password-changed",
      entityType: "User",
      entityId: user.id,
      next: { passwordChangedAt: new Date().toISOString() },
    });
  });

  redirect("/dashboard");
}
