import Link from "next/link";
import { FileQuestion, MapPinned, Search, Users } from "lucide-react";
import { prisma } from "@/server/db/prisma";

export const metadata = { title: "Search" };
export const dynamic = "force-dynamic";

async function searchRecords(query: string) {
  if (query.length < 2) return { customers: [], enquiries: [], tours: [] };
  const [customers, enquiries, tours] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { organisation: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { reference: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
    }),
    prisma.enquiry.findMany({
      where: {
        OR: [
          { reference: { contains: query, mode: "insensitive" } },
          { customer: { fullName: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: { customer: { select: { fullName: true } } },
      take: 10,
    }),
    prisma.tour.findMany({
      where: {
        OR: [
          { reference: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { customer: { fullName: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: { customer: { select: { fullName: true } } },
      take: 10,
    }),
  ]);
  return { customers, enquiries, tours };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = await searchRecords(query);
  const sections = [
    {
      title: "Customers",
      icon: Users,
      items: results.customers.map((item) => ({
        id: item.id,
        href: `/customers/${item.id}`,
        title: item.fullName,
        detail: `${item.reference}${item.phone ? ` · ${item.phone}` : ""}`,
      })),
    },
    {
      title: "Enquiries",
      icon: FileQuestion,
      items: results.enquiries.map((item) => ({
        id: item.id,
        href: `/enquiries/${item.id}`,
        title: `${item.reference} · ${item.customer.fullName}`,
        detail: item.status.toLowerCase().replaceAll("_", " "),
      })),
    },
    {
      title: "Tours",
      icon: MapPinned,
      items: results.tours.map((item) => ({
        id: item.id,
        href: `/tours/${item.id}`,
        title: item.name,
        detail: `${item.reference} · ${item.customer.fullName}`,
      })),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#176b55]">
        Global search
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {query ? `Results for “${query}”` : "Find a record"}
      </h1>
      <form className="mt-6 flex items-center gap-3 rounded-xl border bg-white px-4">
        <Search className="size-4 text-[#7b8580]" />
        <input
          className="h-12 flex-1 bg-transparent text-sm outline-none"
          name="q"
          defaultValue={query}
          placeholder="Search tours, customers, or enquiries"
          autoFocus
        />
      </form>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {sections.map((section) => (
          <section key={section.title} className="overflow-hidden rounded-2xl border bg-white">
            <div className="flex items-center gap-3 border-b px-5 py-4">
              <section.icon className="size-4 text-[#176b55]" />
              <h2 className="font-semibold">{section.title}</h2>
              <span className="ml-auto text-xs text-[#7b8580]">{section.items.length}</span>
            </div>
            <div className="divide-y">
              {section.items.map((item) => (
                <Link key={item.id} href={item.href} className="block px-5 py-4 hover:bg-[#fafaf7]">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs capitalize text-[#7b8580]">{item.detail}</p>
                </Link>
              ))}
              {!section.items.length ? (
                <p className="px-5 py-8 text-center text-xs text-[#8b948f]">No matches</p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
