import { Compass, LockKeyhole, Mail } from "lucide-react";
import { signInAction } from "@/modules/auth/actions/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <section className="w-full max-w-md rounded-lg bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:p-8">
        <div className="mb-7 text-center">
          <span className="mx-auto grid size-24 place-items-center rounded-lg bg-[#011478] text-white shadow-lg shadow-blue-950/15">
            <Compass className="size-11" />
          </span>
          <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.22em] text-[#011478]">Hineni</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-800">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-500">Secure access to your tour operations dashboard</p>
        </div>

        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <form action={signInAction} className="space-y-5">
          <label className="block text-sm font-medium text-gray-700">
            Email address
            <span className="mt-1.5 flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 shadow-sm focus-within:border-[#3a57e8] focus-within:ring-4 focus-within:ring-blue-100">
              <Mail className="size-4 text-gray-400" />
              <input
                required
                name="email"
                type="email"
                autoComplete="email"
                className="h-11 w-full border-0 bg-transparent p-0 text-sm outline-none ring-0"
                placeholder="you@example.com"
              />
            </span>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Password
            <span className="mt-1.5 flex items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 shadow-sm focus-within:border-[#3a57e8] focus-within:ring-4 focus-within:ring-blue-100">
              <LockKeyhole className="size-4 text-gray-400" />
              <input
                required
                name="password"
                type="password"
                autoComplete="current-password"
                className="h-11 w-full border-0 bg-transparent p-0 text-sm outline-none ring-0"
                placeholder="••••••••"
              />
            </span>
          </label>
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00105f] focus:ring-4 focus:ring-blue-100"
          >
            Sign in
          </button>
        </form>

        <div className="mt-7 border-t border-gray-200 pt-5 text-center">
          <p className="text-xs text-gray-500">Hineni Tour Operations · Secure team access</p>
        </div>
      </section>
    </main>
  );
}