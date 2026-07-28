# Deployment

## Runtime

- Node.js 20.19 or newer
- PostgreSQL 17 or newer
- Persistent HTTPS endpoint
- No Supabase service is required

## Required environment

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

Do not commit `.env`. Railway variables should be configured in the service and
PostgreSQL environments.

## Railway flow

`railway.json` builds with `npm run build`, starts with
`npm run db:deploy && npm start`, and checks `/api/health`.

1. Provision PostgreSQL and the web service.
2. Configure the three required variables.
3. Deploy the repository.
4. Confirm that both migrations apply successfully.
5. Confirm `/api/health` returns `{"status":"ok"}`.
6. Visit `/setup` and create the first administrator.
7. Confirm `/setup` redirects to `/login` after initial setup.
8. Add initial exchange rates and verify reporting-currency conversions.

## Backup and recovery

- Enable automated daily PostgreSQL backups with point-in-time recovery where available.
- Retain at least 30 daily restore points and test a restore quarterly.
- Documents are stored in PostgreSQL, so database backups include uploaded files.
- Never restore only selected finance tables; restore the database as one consistent unit.
- Before deployment, take a backup and run `npm run db:deploy`; never use schema reset
  or `prisma migrate dev` against production.

## Release verification

```powershell
npm ci
npm run typecheck
npm run lint
npm test -- --run
npm run build
npm run db:deploy
npx prisma migrate status
```

Then verify login, dashboard, enquiry conversion, quotation acceptance, booking,
finance, resource conflict blocking, readiness, reports, documents, and CSV export
against the deployed PostgreSQL service.
