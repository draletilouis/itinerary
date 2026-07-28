# Hineni Tour Operations — Implementation Report

## Delivered workflow

The application now connects the complete operational chain:

1. PostgreSQL-backed authentication, settings, currencies, exchange rates,
   reference numbering, users, audit events, and record-linked file storage.
2. Customers, travellers, enquiries, follow-ups, communications, pipeline
   history, and enquiry-to-tour conversion.
3. Destinations, routes, activities, accommodation, room types, supplier rates,
   and supplier records.
4. Versioned day-by-day itineraries with separate client and internal content.
5. Decimal-safe multi-currency cost worksheets and preserved exchange evidence.
6. Margin controls, immutable pricing revisions, quotation snapshots, lifecycle
   guards, previews, and customer-safe proposal PDFs.
7. Transactional quotation acceptance, bookings, traveller assignment, payment
   schedules, capacity rules, and non-destructive cancellation.
8. Invoices, receipts, allocations, refunds, supplier bills/payments, expenses,
   and actual profitability.
9. Vehicles, drivers, guides, equipment, availability, maintenance, tour
   assignments, conflict blocking, and audited conflict overrides.
10. Operational checklists, derived readiness, supplier confirmations, active
    tour controls, incidents, and frozen operational-document snapshots.
11. Enquiry, booking, finance, profitability, resource, and incident reporting
    with reporting-currency conversion and CSV export.
12. Secure first-user setup, bounded CSV imports, immutable audit-history UI,
    PostgreSQL document uploads, database-derived notifications, runtime
    constraints, production build verification, and deployment documentation.

## Financial and operational invariants

- Monetary values use PostgreSQL `Decimal` columns and Prisma Decimal arithmetic.
- Original transaction amounts, currencies, rates, and rate dates are preserved.
- Accepted quotations and generated operational documents are immutable snapshots.
- Customer documents exclude internal costs and margin data.
- Refunds, reversals, cancellation, and expense reversal are non-destructive.
- Resource overlap checks run in serializable transactions.
- Conflicts are blocked unless a meaningful override reason is supplied and audited.
- PostgreSQL check constraints enforce valid ranges and matching resource foreign keys.
- Readiness is derived from booking state, frozen itinerary, travellers, full-tour
  confirmed resources, tasks, confirmations, and serious open incidents.
- Consolidated reports exclude unresolved conversions instead of guessing rates.

## Verification completed

- Prisma schema validation and client generation
- Two migrations applied to the live local PostgreSQL database
- Live seed verification
- TypeScript checking
- ESLint with zero warnings
- 34 unit tests across eight suites
- Optimized Next.js production build
- Production `/api/health`, root redirect, and setup-page HTTP checks
- No Supabase dependency or reference

## Genuine limitations

- The in-app visual browser harness could not initialize because the desktop
  sandbox could not read its browser helper through the OneDrive ACL. Production
  HTTP checks and Next route generation passed; a manual responsive browser pass
  should still be completed before public launch.
- npm currently reports three high-severity production advisories inherited through
  Next.js 15.5.21 (`postcss` and `sharp`). The project is already on the latest
  Next 15 backport. npm proposes an invalid downgrade, and the current supported
  Sharp line has no patched release, so no unsafe forced override was applied.
- The first administrator intentionally remains uncreated. Visit `/setup` once and
  choose a private password; the route disables itself after that transaction.
- Railway deployment configuration is present, but a production service, domain,
  PostgreSQL URL, monitoring destination, and backup policy must be provisioned by
  the deployment owner.
