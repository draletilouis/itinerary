# Hineni Tour Operations Architecture

## Product boundary

Hineni is one Next.js App Router application backed by one PostgreSQL database.
It is a modular monolith: modules own their schemas, services, queries, actions,
and components, while shared infrastructure remains under `src/server`.

The browser is a workflow and presentation layer. Authoritative validation,
financial calculations, authentication, audit creation, reference generation,
and Prisma writes run on the server.

## Non-negotiable invariants

- All active authenticated users have equal application access in version one.
- Monetary values use `Prisma.Decimal`; JavaScript floating-point arithmetic is
  not used for persisted financial calculations.
- Original currencies, applied exchange rates, and converted values are stored.
- Historical quotation and exchange-rate snapshots are immutable.
- A tour can have its own minimum margin or no minimum margin.
- Continuing below a selected tour minimum requires a recorded reason.
- Accepted quotations, financial records, bookings, and completed tours are not
  silently recalculated or deleted.
- Customer documents do not receive internal costing fields.
- Important state changes and overrides create audit events in the same database
  transaction as the business write.

## Module boundaries

- `src/app`: routes, layouts, and route handlers.
- `src/components`: shared interface components.
- `src/modules`: business modules. Domain logic belongs in services, not React.
- `src/server/auth`: PostgreSQL-backed credentials, sessions, and equal-access enforcement.
- `src/server/db`: Prisma client lifecycle.
- `src/server/audit`: transactional audit writer.
- `src/server/storage`: validated attachment storage backed by PostgreSQL.
- `prisma`: schema, additive migrations, and idempotent reference data seed.

## Delivery sequence

1. Foundation: application shell, authentication, company settings, currencies,
   exchange rates, reference numbering, audit history, and seed data.
2. Customers and enquiries.
3. Tour catalogue and suppliers.
4. Itinerary builder and immutable versions.
5. Multi-currency costing.
6. Markup, tour-specific minimum margins, quotation snapshots, and documents.
7. Booking conversion and travellers.
8. Customer and supplier finance.
9. Resources, availability, and conflict detection.
10. Tour operations, incidents, and operational documents.
11. Reports and exports.
12. Accessibility, security, performance, browser coverage, and deployment.

Each phase must add persistent workflows and server-enforced business results.
Static demonstration screens and mock-only data do not count as completed work.

## Current implementation

The implemented foundation includes the production application shell,
PostgreSQL-backed password and session authentication, equal-access users,
company profile, currencies, effective-dated exchange rates, atomic reference
sequences, core customer/enquiry/tour/booking records, audit history, connected
dashboard queries, company and rate settings, migrations, seed data, and the
decimal-safe pricing service with focused unit tests.

The customer and enquiry slice adds customer and traveller records, searchable
customer history, enquiry list and pipeline views, persistent follow-ups,
communication history, status history, duplication, and transactional
conversion from enquiry to tour.

The catalogue, itinerary, costing, and quotation slices add destinations, routes,
suppliers, activities, accommodation, room types, effective-dated rates,
versioned day-by-day itineraries, separate client and internal content,
immutable published versions, multi-currency cost items with preserved exchange
rates, tour-specific minimum margins, and immutable pricing revisions.

The quotation slice adds atomic quotation references, immutable numbered
versions, frozen itinerary, pricing, cost, and exchange-rate evidence, guarded
generated/sent/accepted/declined/expired transitions, revision reasons,
validity enforcement, customer previews, and authenticated customer-safe PDF
downloads that explicitly exclude internal cost and margin data.

The booking slice converts an accepted quotation into one persistent booking in
the same transaction, freezes the accepted quotation and itinerary versions,
confirms the source enquiry and tour, preserves the accepted total and currency,
and adds capacity-checked traveller assignments, lead travellers, deposit and
instalment schedules, booking status, and audited non-destructive cancellation.

The finance slice adds schedule and additional-service invoices, customer-safe
invoice and receipt PDFs, multi-currency customer payments with preserved rates,
explicit invoice allocations, guarded refunds and payment reversals, supplier
bills and multi-currency supplier payments, actual tour expenses, and automatic
actual-profitability updates in the tour costing currency.

The resource slice adds vehicles, drivers, guides, equipment, availability,
maintenance, serializable conflict detection, explicit audited overrides, and
tour assignments. The operations slice adds mandatory tasks, derived readiness,
supplier confirmations, active-tour control, incidents, and immutable operational
document snapshots. Reporting consolidates financial values into the company
reporting currency only when an effective direct or inverse rate exists. Hardening
adds first-user setup, bounded imports, audit history, PostgreSQL documents, live
notifications, database check constraints, deployment guidance, and full build
verification. Current genuine limitations are recorded in `IMPLEMENTATION_REPORT.md`.
