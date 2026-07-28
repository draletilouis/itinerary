import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Hineni Tour Operations",
    template: "%s · Hineni",
  },
  description:
    "Tour planning, costing, quotations, bookings, operations, and profitability in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
