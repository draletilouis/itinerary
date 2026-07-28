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
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-[#123d32] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_15%_20%,#dca45c_0,transparent_26%),radial-gradient(circle_at_85%_75%,#4d9c82_0,transparent_32%)]" />
        <div className="relative flex items-center gap-3 text-lg font-semibold">
          <span className="grid size-10 place-items-center rounded-xl bg-white/10">
            <Compass className="size-5" />
          </span>
          Hineni Tour Operations
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-[#eac58f]">
            One connected journey
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">
            From the first enquiry to the final profit review.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/70">
            Plan memorable guest experiences while the system keeps costing,
            pricing, schedules, documents, and operations aligned.
          </p>
        </div>
        <p className="relative text-sm text-white/45">
          Secure access for the Hineni operations team
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3 font-semibold">
              <span className="grid size-10 place-items-center rounded-xl bg-[#176b55] text-white">
                <Compass className="size-5" />
              </span>
              Hineni Tour Operations
            </div>
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#176b55]">
            Welcome back
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Sign in to continue
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#68736e]">
            Use the email and password connected to your Hineni account.
          </p>

          {error ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form action={signInAction} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Email address</span>
              <span className="flex items-center gap-3 rounded-xl border bg-white px-4 focus-within:ring-2 focus-within:ring-[#176b55]/20">
                <Mail className="size-4 text-[#7b8580]" />
                <input
                  required
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="h-12 w-full bg-transparent text-sm outline-none"
                  placeholder="name@company.com"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Password</span>
              <span className="flex items-center gap-3 rounded-xl border bg-white px-4 focus-within:ring-2 focus-within:ring-[#176b55]/20">
                <LockKeyhole className="size-4 text-[#7b8580]" />
                <input
                  required
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="h-12 w-full bg-transparent text-sm outline-none"
                  placeholder="Your password"
                />
              </span>
            </label>
            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-[#176b55] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f4e3d]"
            >
              Sign in
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
