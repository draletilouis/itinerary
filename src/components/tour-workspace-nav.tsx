import Link from "next/link";
import {
  BookOpenCheck,
  Calculator,
  ClipboardCheck,
  FileCheck2,
  FolderOpen,
  LayoutDashboard,
  ReceiptText,
} from "lucide-react";

const tabs = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "itinerary", label: "Itinerary", icon: BookOpenCheck },
  { key: "costing", label: "Costing", icon: Calculator },
  { key: "quotation", label: "Quotation", icon: FileCheck2 },
  { key: "booking", label: "Booking", icon: ReceiptText },
  { key: "operations", label: "Operations", icon: ClipboardCheck },
  { key: "documents", label: "Documents", icon: FolderOpen },
] as const;

export function TourWorkspaceNav({
  tourId,
  active,
  itineraryId,
  bookingId,
}: {
  tourId: string;
  active: (typeof tabs)[number]["key"];
  itineraryId?: string | null;
  bookingId?: string | null;
}) {
  const hrefs: Record<(typeof tabs)[number]["key"], string> = {
    overview: `/tours/${tourId}`,
    itinerary: itineraryId ? `/itineraries/${itineraryId}` : `/itineraries/new?tourId=${tourId}`,
    costing: `/tours/${tourId}/costing`,
    quotation: `/tours/${tourId}/quotation`,
    booking: bookingId ? `/bookings/${bookingId}` : `/tours/${tourId}/quotation`,
    operations: `/operations?tourId=${tourId}`,
    documents: `/documents?tourId=${tourId}`,
  };

  return (
    <nav className="mt-6 overflow-x-auto rounded-xl border bg-white p-2" aria-label="Tour workspace">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={hrefs[tab.key]}
              className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${
                selected ? "bg-[#011478] text-white" : "text-[#4b5563] hover:bg-[#f9fafb]"
              }`}
            >
              <Icon className="size-4" /> {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
