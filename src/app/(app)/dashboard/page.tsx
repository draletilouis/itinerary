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
import { dashboardCurrencyTotals } from "@/modules/dashboard/presentation";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  OPERATIONAL_PREPARATION: "Preparing",
  IN_PROGRESS: "In progress",
  AWAITING_CONFIRMATION: "Awaiting confirmation",
};

function currencyTotals(values: Array<{ currencyCode: string; amount: string }>) {
  const totals = dashboardCurrencyTotals(values);
  return (
    <span className="flex flex-col gap-1">
      {totals.map((entry) => (
        <span key={entry.currencyCode}>{formatMoney(entry.amount, entry.currencyCode)}</span>
      ))}
    </span>
  );
}

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
      value: currencyTotals(data.metrics.revenueThisMonth),
      icon: CircleDollarSign,
      detail: "kept in each tour currency",
    },
    {
      label: "Outstanding Payments",
      value: currencyTotals(data.metrics.outstandingPayments),
      icon: WalletCards,
      detail: "kept in each booking currency",
    },
    {
      label: "Estimated Tour Profit",
      value: currencyTotals(data.metrics.estimatedProfit),
      icon: TrendingUp,
      detail: "kept in each quotation currency",
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
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#176b55]">
            Operations overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            What needs attention today?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68736e]">
            A live view of enquiries, departures, payments, and operational
            readiness across the company.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/tours/new" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#176b55] px-4 text-sm font-semibold text-white">
            Create new tour <ArrowRight className="size-4" />
          </Link>
          <Link href="/tours" className="flex h-11 items-center justify-center rounded-xl border bg-white px-4 text-sm font-semibold shadow-sm">
            View all tours
          </Link>
        </div>
      </div>

      {!data.connected ? (
        <div className="mt-6 rounded-2xl border border-[#e7c98f] bg-[#fff8e8] px-5 py-4 text-sm text-[#745521]">
          The application shell is ready, but live dashboard data will appear
          after the PostgreSQL connection is configured and migrations are
          applied.
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgba(18,61,50,0.04)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#68736e]">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {metric.value}
                </p>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-[#edf5f1] text-[#176b55]">
                <metric.icon className="size-[18px]" />
              </span>
            </div>
            <p className="mt-4 text-xs text-[#8b948f]">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <article className="overflow-hidden rounded-2xl border bg-white">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Operational timeline</h2>
              <p className="mt-1 text-xs text-[#7b8580]">
                Tours in progress and departing soon
              </p>
            </div>
            <CalendarDays className="size-5 text-[#176b55]" />
          </div>
          {data.timeline.length ? (
            <div className="divide-y">
              {data.timeline.map((tour) => (
                <Link
                  key={tour.id}
                  href={`/tours/${tour.id}`}
                  className="grid gap-3 px-5 py-4 transition hover:bg-[#fafaf7] sm:grid-cols-[92px_1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {tour.startDate.toLocaleDateString("en-UG", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                    <p className="mt-1 text-[11px] text-[#8b948f]">{tour.reference}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{tour.name}</p>
                    <p className="mt-1 truncate text-xs text-[#7b8580]">
                      {tour.customer.fullName}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-[#edf5f1] px-2.5 py-1 text-[11px] font-semibold text-[#176b55]">
                    {statusLabels[tour.status] ??
                      tour.status.toLowerCase().replaceAll("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center px-6 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f1f3ef] text-[#7b8580]">
                  <CalendarDays className="size-5" />
                </span>
                <p className="mt-4 text-sm font-medium">No upcoming tour activity</p>
                <p className="mt-1 text-xs text-[#7b8580]">
                  Confirmed tours will appear here automatically.
                </p>
              </div>
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border bg-white">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Attention centre</h2>
              <p className="mt-1 text-xs text-[#7b8580]">
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
                  className="flex items-center gap-3 px-5 py-4 hover:bg-[#fafaf7]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fff4df] text-[#b66f16]">
                    <Clock3 className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      Follow up with {enquiry.customer.fullName}
                    </span>
                    <span className="mt-1 block text-xs text-[#7b8580]">
                      {enquiry.reference}  -  due{" "}
                      {enquiry.followUpAt?.toLocaleDateString("en-UG")}
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-[#a0a8a4]" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center px-6 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#edf5f1] text-[#176b55]">
                  <Users className="size-5" />
                </span>
                <p className="mt-4 text-sm font-medium">You are caught up</p>
                <p className="mt-1 text-xs text-[#7b8580]">
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
