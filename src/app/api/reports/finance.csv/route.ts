import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getReportsWorkspace } from "@/modules/reports/queries/reports";

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const data = await getReportsWorkspace();
  const rows = [
    [
      "Tour reference",
      "Tour name",
      "Status",
      "Start date",
      "Costing currency",
      "Original revenue",
      "Original cost",
      "Original profit",
      "Reporting currency",
      "Reporting revenue",
      "Reporting cost",
      "Reporting profit",
      "Actual margin",
    ],
    ...data.tourProfitability.map((tour) => [
      tour.reference,
      tour.name,
      tour.status,
      tour.startDate.toISOString().slice(0, 10),
      tour.costingCurrencyCode,
      tour.actualRevenue.toString(),
      tour.actualCost.toString(),
      tour.actualProfit.toString(),
      data.reportingCurrency,
      tour.reportingRevenue?.toString() ?? "RATE_MISSING",
      tour.reportingCost?.toString() ?? "RATE_MISSING",
      tour.reportingProfit?.toString() ?? "RATE_MISSING",
      tour.actualMargin.toString(),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hineni-finance-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
