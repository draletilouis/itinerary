import { Building2, Coins, RefreshCw, UserRoundPlus, Users } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import {
  createExchangeRateAction,
  updateCompanyProfileAction,
} from "@/modules/settings/actions/settings";
import {
  createUserAction,
  setUserStatusAction,
} from "@/modules/settings/actions/users";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

async function getSettings() {
  try {
    const [profile, currencies, rates, users] = await Promise.all([
      prisma.companyProfile.findUnique({ where: { singletonKey: "primary" } }),
      prisma.currency.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
      prisma.exchangeRate.findMany({
        orderBy: { effectiveAt: "desc" },
        take: 8,
        include: { baseCurrency: true, quoteCurrency: true },
      }),
      prisma.user.findMany({
        orderBy: [{ status: "asc" }, { fullName: "asc" }],
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          mustChangePassword: true,
        },
      }),
    ]);
    return { connected: true, profile, currencies, rates, users };
  } catch {
    return { connected: false, profile: null, currencies: [], rates: [], users: [] };
  }
}

const inputClass =
  "mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#011478]/20";

export default async function SettingsPage() {
  const data = await getSettings();
  const currenciesConfigured = data.currencies.length >= 2;

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#011478]">
        Configuration
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4b5563]">
        Set the company identity and the currencies used for costing, quotations,
        payments, and management reporting.
      </p>
      <Link
        href="/settings/catalogue"
        className="mt-5 inline-flex h-11 items-center rounded-lg border bg-white px-4 text-sm font-semibold text-[#011478]"
      >
        Open tour catalogue
      </Link>
      <Link
        href="/settings/audit"
        className="ml-2 mt-5 inline-flex h-11 items-center rounded-lg border bg-white px-4 text-sm font-semibold text-[#011478]"
      >
        View audit history
      </Link>

      {!data.connected ? (
        <div className="mt-6 rounded-xl border border-[#e7c98f] bg-[#fff8e8] px-5 py-4 text-sm text-[#745521]">
          Configure PostgreSQL and apply the database migration before editing
          company settings.
        </div>
      ) : null}

      {data.connected && !currenciesConfigured ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          Core currencies are missing. Apply the latest production migration before
          saving company settings or exchange rates.
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-xl border bg-white">
          <div className="flex items-center gap-3 border-b px-6 py-5">
            <span className="grid size-10 place-items-center rounded-lg bg-[#eff3ff] text-[#011478]">
              <Building2 className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">Company profile</h2>
              <p className="mt-1 text-xs text-[#6b7280]">
                Used on quotations, invoices, receipts, and proposals
              </p>
            </div>
          </div>
          <form action={updateCompanyProfileAction} className="grid gap-5 p-6 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Company name</span>
              <input
                className={inputClass}
                name="name"
                required
                defaultValue={data.profile?.name ?? "Hineni Tours"}
              />
            </label>
            <label>
              <span className="text-sm font-medium">Email</span>
              <input
                className={inputClass}
                name="email"
                type="email"
                defaultValue={data.profile?.email ?? ""}
              />
            </label>
            <label>
              <span className="text-sm font-medium">Phone</span>
              <input
                className={inputClass}
                name="phone"
                defaultValue={data.profile?.phone ?? ""}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Address</span>
              <input
                className={inputClass}
                name="address"
                defaultValue={data.profile?.address ?? ""}
              />
            </label>
            <label>
              <span className="text-sm font-medium">Website</span>
              <input
                className={inputClass}
                name="website"
                defaultValue={data.profile?.website ?? ""}
              />
            </label>
            <label>
              <span className="text-sm font-medium">Reporting currency</span>
              <select
                className={inputClass}
                name="reportingCurrencyCode"
                defaultValue={data.profile?.reportingCurrencyCode ?? "UGX"}
              >
                {data.currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} / {currency.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2">
              <button
                disabled={!data.connected || !currenciesConfigured}
                className="h-11 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save company profile
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border bg-white">
          <div className="flex items-center gap-3 border-b px-6 py-5">
            <span className="grid size-10 place-items-center rounded-lg bg-[#fff4df] text-[#b66f16]">
              <RefreshCw className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">Add exchange rate</h2>
              <p className="mt-1 text-xs text-[#6b7280]">
                Historical rates are preserved by effective date
              </p>
            </div>
          </div>
          <form action={createExchangeRateAction} className="grid gap-5 p-6 sm:grid-cols-2">
            <label>
              <span className="text-sm font-medium">From</span>
              <select className={inputClass} name="baseCurrencyCode" defaultValue="USD">
                {data.currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-medium">To</span>
              <select className={inputClass} name="quoteCurrencyCode" defaultValue="UGX">
                {data.currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-medium">Rate</span>
              <input
                className={inputClass}
                name="rate"
                inputMode="decimal"
                required
                placeholder="3850"
              />
            </label>
            <label>
              <span className="text-sm font-medium">Effective date</span>
              <input
                className={inputClass}
                name="effectiveAt"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium">Source reference</span>
              <input
                className={inputClass}
                name="sourceReference"
                placeholder="Bank rate, provider, or internal note"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                disabled={!data.connected || !currenciesConfigured}
                className="h-11 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save exchange rate
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border bg-white">
        <div className="flex items-center gap-3 border-b px-6 py-5">
          <Coins className="size-5 text-[#011478]" />
          <div>
            <h2 className="font-semibold">Recent exchange rates</h2>
            <p className="mt-1 text-xs text-[#6b7280]">
              Rates remain immutable when locked into a quotation
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#f9fafb] text-xs uppercase tracking-wide text-[#6b7280]">
              <tr>
                <th className="px-6 py-3 font-medium">Pair</th>
                <th className="px-6 py-3 font-medium">Rate</th>
                <th className="px-6 py-3 font-medium">Effective</th>
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.rates.map((rate) => (
                <tr key={rate.id}>
                  <td className="px-6 py-4 font-semibold">
                    {rate.baseCurrencyCode} / {rate.quoteCurrencyCode}
                  </td>
                  <td className="px-6 py-4">{rate.rate.toString()}</td>
                  <td className="px-6 py-4">
                    {rate.effectiveAt.toLocaleDateString("en-UG")}
                  </td>
                  <td className="px-6 py-4 text-[#4b5563]">
                    {rate.sourceReference ?? rate.source.toLowerCase()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-[#eff3ff] px-2.5 py-1 text-xs font-semibold text-[#011478]">
                      {rate.lockedAt ? "Locked" : "Available"}
                    </span>
                  </td>
                </tr>
              ))}
              {!data.rates.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-[#6b7280]">
                    No exchange rates have been recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-white">
        <div className="flex items-center gap-3 border-b px-6 py-5">
          <span className="grid size-10 place-items-center rounded-lg bg-[#eff3ff] text-[#011478]">
            <Users className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">Internal users</h2>
            <p className="mt-1 text-xs text-[#6b7280]">
              Every active user has the same application access
            </p>
          </div>
        </div>
        <div className="grid xl:grid-cols-[1fr_0.8fr]">
          <div className="overflow-x-auto border-b xl:border-b-0 xl:border-r">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#f9fafb] text-xs uppercase tracking-wide text-[#6b7280]">
                <tr>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Last login</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium">{user.fullName}</p>
                      <p className="mt-1 text-xs text-[#6b7280]">{user.email}</p>
                    </td>
                    <td className="px-6 py-4 text-[#4b5563]">
                      {user.lastLoginAt
                        ? user.lastLoginAt.toLocaleString("en-UG")
                        : "Not yet"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          user.status === "ACTIVE"
                            ? "rounded-full bg-[#eff3ff] px-2.5 py-1 text-xs font-semibold text-[#011478]"
                            : "rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs font-semibold text-[#4b5563]"
                        }
                      >
                        {user.status === "ACTIVE" ? "Active" : "Inactive"}
                        {user.mustChangePassword && user.status === "ACTIVE"
                          ? " / password pending"
                          : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <form action={setUserStatusAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}
                        />
                        <button className="text-xs font-semibold text-[#011478]">
                          {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {!data.users.length ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-[#6b7280]">
                      Seed the bootstrap user to begin managing accounts.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <form action={createUserAction} className="p-6">
            <div className="flex items-center gap-2">
              <UserRoundPlus className="size-4 text-[#011478]" />
              <h3 className="font-semibold">Add internal user</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#6b7280]">
              The user must change the temporary password at first sign-in.
            </p>
            <label className="mt-5 block">
              <span className="text-sm font-medium">Full name</span>
              <input className={inputClass} name="fullName" required />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium">Email</span>
              <input className={inputClass} name="email" type="email" required />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium">Temporary password</span>
              <input
                className={inputClass}
                name="temporaryPassword"
                type="password"
                minLength={12}
                required
              />
            </label>
            <button
              disabled={!data.connected || !currenciesConfigured}
              className="mt-5 h-11 rounded-lg bg-[#011478] px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Create user
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
