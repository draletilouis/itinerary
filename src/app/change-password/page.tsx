import { KeyRound } from "lucide-react";
import { changePasswordAction } from "@/modules/auth/actions/password";
import { requireCurrentUser } from "@/server/auth/session";

export const metadata = { title: "Change password" };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireCurrentUser();
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border bg-white p-7 shadow-sm">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#edf5f1] text-[#176b55]">
          <KeyRound className="size-5" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Choose a secure password
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#68736e]">
          Signed in as {user.email}. Your new password must contain at least 12
          characters.
        </p>
        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <form action={changePasswordAction} className="mt-6 space-y-4">
          {[
            ["currentPassword", "Current password"],
            ["newPassword", "New password"],
            ["confirmPassword", "Confirm new password"],
          ].map(([name, label]) => (
            <label key={name} className="block">
              <span className="text-sm font-medium">{label}</span>
              <input
                className="mt-2 h-12 w-full rounded-xl border px-4 text-sm outline-none focus:ring-2 focus:ring-[#176b55]/20"
                name={name}
                type="password"
                required
                minLength={name === "currentPassword" ? undefined : 12}
                autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
              />
            </label>
          ))}
          <button className="h-12 w-full rounded-xl bg-[#176b55] px-5 text-sm font-semibold text-white">
            Save new password
          </button>
        </form>
      </section>
    </main>
  );
}
