# Zigopay

Invoicing and automatic release orders for cargo companies. Staff record cargo and create invoices; each invoice gets its own TCB bank account through Daraja; the customer receives the invoice PDF on WhatsApp and a link by SMS; when Daraja's payment webhook shows the invoice is fully paid, Zigopay issues and sends the release order.

Stack: Next.js 15 (App Router, TypeScript), Postgres with Drizzle ORM, Auth.js staff login, Tailwind CSS. Deployed on Vercel.

## Run locally

Needs Node 20+ and a Postgres database.

```bash
cp .env.example .env.local   # then fill in AUTH_SECRET and SEED_ADMIN_PASSWORD
npm install
npm run db:migrate
npm run db:seed              # demo company, admin login and sample data
npm run dev
```

Sign in at http://localhost:3000 with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

## Deploy on Vercel

1. Import this repository as a Vercel project.
2. Add **Neon Postgres** from the Vercel Marketplace. It sets `DATABASE_URL`.
3. Add `AUTH_SECRET` under Settings → Environment Variables (`openssl rand -base64 32`).
4. Deploy. The `vercel-build` script applies database migrations before building.
5. Seed once from your machine with the production `DATABASE_URL`: `DATABASE_URL=... SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:seed`.

Never commit secrets. Daraja, Mifumo SMS and WhatsApp keys are added the same way when their milestone arrives.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` / `npm run lint` | Checks |
| `npm run db:generate` | New migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Demo data (skips if a company already exists) |
