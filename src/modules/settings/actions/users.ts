"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";
import { requireCurrentUser } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";

const createUserSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the user's full name."),
  email: z.string().trim().toLowerCase().email(),
  temporaryPassword: z.string().min(1, "Temporary password is required."),
});

export async function createUserAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid user details.");
  }
  const passwordHash = await hashPassword(parsed.data.temporaryPassword);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        passwordHash,
        mustChangePassword: true,
      },
    });
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: "user.created",
      entityType: "User",
      entityId: user.id,
      next: {
        fullName: user.fullName,
        email: user.email,
        status: user.status,
      },
    });
  });

  revalidatePath("/settings");
}

export async function setUserStatusAction(formData: FormData) {
  const actor = await requireCurrentUser();
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "ACTIVE" && status !== "INACTIVE") {
    throw new Error("Invalid user status.");
  }
  if (actor.id === userId && status === "INACTIVE") {
    throw new Error("You cannot deactivate your own account.");
  }

  await prisma.$transaction(async (tx) => {
    const previous = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const user = await tx.user.update({ where: { id: userId }, data: { status } });
    if (status === "INACTIVE") {
      await tx.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await writeAuditEvent(tx, {
      actorId: actor.id,
      action: status === "ACTIVE" ? "user.activated" : "user.deactivated",
      entityType: "User",
      entityId: user.id,
      previous: { status: previous.status },
      next: { status: user.status },
    });
  });

  revalidatePath("/settings");
}
