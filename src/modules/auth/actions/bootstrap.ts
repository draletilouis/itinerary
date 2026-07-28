"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { writeAuditEvent } from "@/server/audit/service";

const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/\d/, "Include a number.")
  .regex(/[^A-Za-z0-9]/, "Include a symbol.");

export async function bootstrapAdministratorAction(formData: FormData) {
  const data = z
    .object({
      fullName: z.string().trim().min(3),
      email: z.string().trim().toLowerCase().email(),
      password: passwordSchema,
      confirmPassword: z.string(),
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    })
    .parse(Object.fromEntries(formData));

  const user = await prisma.$transaction(
    async (tx) => {
      const existingUsers = await tx.user.count();
      if (existingUsers > 0) {
        throw new Error("Initial setup is already complete.");
      }
      const created = await tx.user.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          passwordHash: await hashPassword(data.password),
          mustChangePassword: false,
          passwordChangedAt: new Date(),
          status: "ACTIVE",
        },
      });
      await writeAuditEvent(tx, {
        actorId: created.id,
        action: "system.bootstrap-administrator-created",
        entityType: "User",
        entityId: created.id,
        next: { email: created.email, fullName: created.fullName },
      });
      return created;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  await createSession(user.id);
  redirect("/dashboard");
}
