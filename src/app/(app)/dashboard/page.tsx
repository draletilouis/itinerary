import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileQuestion,
  MapPin,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { getDashboardData } from "@/modules/dashboard/queries/get-dashboard";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  OPERATIONAL_PREPARATION: "Preparing",
  IN_PROGRESS: "In progress",
  AWAITING_CONFIRMATION: "Awaiting confirmation",
};


export default async function DashboardPage() {
  const data = await getDashboardData();
  const metrics = [
    {
      label: "Active Tours",
      value: data.metrics.activeTours,
      icon: MapPin,
      detail: "confirmed or underway",
    },
    {
      label: "Upcoming Tours",
      value: data.metrics.upcomingTours,
      icon: CalendarRange,
      detail: "departing in 30 days",
    },
    {
      label: "Open Enquiries",
      value: data.metrics.openEnquiries,
      icon: FileQuestion,
      detail: "still in the pipeline",
    },
    {
      label: "Confirmed Bookings",
      value: data.metrics.confirmedBookings,
      icon: CheckCircle2,
      detail: "active commitments",
    },
    {
      label: "Revenue This Month",
      value: formatMoney(data.metrics.revenueThisMonth, data.metrics.reportingCurrency),
      icon: CircleDollarSign,
      detail: "converted to UGX",
    },
    {
      label: "Outstanding Payments",
      value: formatMoney(data.metrics.outstandingPayments, data.metrics.reportingCurrency),
      icon: WalletCards,
      detail: "converted to UGX",
    },
    {
      label: "Estimated Tour Profit",
      value: formatMoney(data.metrics.estimatedProfit, data.metrics.reportingCurrency),
      icon: TrendingUp,
      detail: "converted to UGX",
    },
    {
      label: "Scheduling Conflicts",
      value: data.metrics.schedulingConflicts,
      icon: AlertTriangle,
      detail: "requiring attention",
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-white to-blue-50/60 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#011478]">Operations overview</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#011478] md:text-4xl">What needs attention today?</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">A live view of enquiries, departures, payments, and operational readiness across the company.</p>
            <p className="mt-2 text-xs font-medium text-gray-500">{new Date().toLocaleDateString("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/tours/new" className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#011478] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#00105f]">Create new tour <ArrowRight className="size-4" /></Link>
            <Link href="/tours" className="flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold shadow-sm hover:bg-gray-50">View all tours</Link>
          </div>
        </div>
      </div>
      {!data.connected ? (
        <div className="mt-6 rounded-xl border border-[#e7c98f] bg-[#fff8e8] px-5 py-4 text-sm text-[#745521]">
          The application shell is ready, but live dashboard data will appear
          after the PostgreSQL connection is configured and migrations are
          applied.
        </div>
      ) : null}

      {data.connected && data.metrics.unresolvedCurrencies.length ? (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Missing an effective UGX exchange rate for: {data.metrics.unresolvedCurrencies.join(", ")}. Those currencies are excluded until a rate is configured in Settings.
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#4b5563]">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {metric.value}
                </p>
              </div>
              <span className="grid size-10 place-items-center rounded-lg bg-[#eff3ff] text-[#011478]">
                <metric.icon className="size-[18px]" />
              </span>
            </div>
            <p className="mt-4 text-xs text-[#9ca3af]">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <article className="overflow-hidden rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Operational timeline</h2>
              <p className="mt-1 text-xs text-[#6b7280]">
                Tours in progress and departing soon
              </p>
            </div>
            <CalendarDays className="size-5 text-[#011478]" />
          </div>
          {data.timeline.length ? (
            <div className="divide-y">
              {data.timeline.map((tour) => (
                <Link
                  key={tour.id}
                  href={`/tours/${tour.id}`}
                  className="grid gap-3 px-5 py-4 transition hover:bg-[#f9fafb] sm:grid-cols-[92px_1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {tour.startDate.toLocaleDateString("en-UG", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                    <p className="mt-1 text-[11px] text-[#9ca3af]">{tour.reference}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{tour.name}</p>
                    <p className="mt-1 truncate text-xs text-[#6b7280]">
                      {tour.customer.fullName}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-[#eff3ff] px-2.5 py-1 text-[11px] font-semibold text-[#011478]">
                    {statusLabels[tour.status] ??
                      tour.status.toLowerCase().replaceAll("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center px-6 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#f3f4f6] text-[#6b7280]">
                  <CalendarDays className="size-5" />
                </span>
                <p className="mt-4 text-sm font-medium">No upcoming tour activity</p>
                <p className="mt-1 text-xs text-[#6b7280]">
                  Confirmed tours will appear here automatically.
                </p>
              </div>
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Attention centre</h2>
              <p className="mt-1 text-xs text-[#6b7280]">
                Follow-ups that are already due
              </p>
            </div>
            <Clock3 className="size-5 text-[#d18a32]" />
          </div>
          {data.overdueFollowUps.length ? (
            <div className="divide-y">
              {data.overdueFollowUps.map((enquiry) => (
                <Link
                  key={enquiry.id}
                  href={`/enquiries/${enquiry.id}`}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-[#f9fafb]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#fff4df] text-[#b66f16]">
                    <Clock3 className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      Follow up with {enquiry.customer.fullName}
                    </span>
                    <span className="mt-1 block text-xs text-[#6b7280]">
                      {enquiry.reference}  -  due{" "}
                      {enquiry.followUpAt?.toLocaleDateString("en-UG")}
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-[#9ca3af]" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center px-6 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#eff3ff] text-[#011478]">
                  <Users className="size-5" />
                </span>
                <p className="mt-4 text-sm font-medium">You are caught up</p>
                <p className="mt-1 text-xs text-[#6b7280]">
                  Overdue enquiry follow-ups will be listed here.
                </p>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
