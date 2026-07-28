import { Compass, KeyRound, Mail, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { bootstrapAdministratorAction } from "@/modules/auth/actions/bootstrap";
import { prisma } from "@/server/db/prisma";

export const metadata = { title: "Initial setup" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await prisma.user.count()) > 0) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f2] px-6 py-12">
      <section className="w-full max-w-lg rounded-3xl border bg-white p-7 shadow-sm sm:p-10">
        <div className="flex items-center gap-3 font-semibold">
          <span className="grid size-11 place-items-center rounded-xl bg-[#123d32] text-white">
            <Compass className="size-5" />
          </span>
          Hineni Tour Operations
        </div>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-[#176b55]">
          Secure first-run setup
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Create the first administrator
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#68736e]">
          This one-time page is disabled permanently after the first user is
          created. All users have equal application access under the current
          operating model.
        </p>

        <form action={bootstrapAdministratorAction} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">
            Full name
            <span className="mt-2 flex items-center gap-3 rounded-xl border px-4 focus-within:ring-2 focus-within:ring-[#176b55]/20">
              <UserRound className="size-4 text-[#7b8580]" />
              <input name="fullName" required autoComplete="name" className="h-12 w-full outline-none" />
            </span>
          </label>
          <label className="block text-sm font-medium">
            Email address
            <span className="mt-2 flex items-center gap-3 rounded-xl border px-4 focus-within:ring-2 focus-within:ring-[#176b55]/20">
              <Mail className="size-4 text-[#7b8580]" />
              <input name="email" type="email" required autoComplete="email" className="h-12 w-full outline-none" />
            </span>
          </label>
          <label className="block text-sm font-medium">
            Password
            <span className="mt-2 flex items-center gap-3 rounded-xl border px-4 focus-within:ring-2 focus-within:ring-[#176b55]/20">
              <KeyRound className="size-4 text-[#7b8580]" />
              <input name="password" type="password" required minLength={12} autoComplete="new-password" className="h-12 w-full outline-none" />
            </span>
          </label>
          <label className="block text-sm font-medium">
            Confirm password
            <span className="mt-2 flex items-center gap-3 rounded-xl border px-4 focus-within:ring-2 focus-within:ring-[#176b55]/20">
              <KeyRound className="size-4 text-[#7b8580]" />
              <input name="confirmPassword" type="password" required minLength={12} autoComplete="new-password" className="h-12 w-full outline-none" />
            </span>
          </label>
          <p className="text-xs leading-5 text-[#7b8580]">
            Use at least 12 characters with uppercase, lowercase, number, and symbol.
          </p>
          <button className="h-12 w-full rounded-xl bg-[#176b55] px-5 text-sm font-semibold text-white">
            Create administrator and continue
          </button>
        </form>
      </section>
    </main>
  );
}
