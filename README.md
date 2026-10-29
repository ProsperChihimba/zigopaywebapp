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
3. Under Settings → Environment Variables add `AUTH_SECRET` (`openssl rand -base64 32`), `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
4. Deploy. The `vercel-build` script applies migrations, creates the demo company and admin login on the first build (later builds skip it), then builds the app.

Never commit secrets. Integrations are configured with the variables listed in `.env.example`. Until a service's variables are set, Zigopay records that service as "not configured" on the invoice page instead of calling it.

| Variable | Used for |
| --- | --- |
| `DARAJA_TOKEN`, `DARAJA_PARTNER_ID` | Opening the TCB account for each invoice |
| `DARAJA_WEBHOOK_SECRET` | Verifying payment webhooks (milestone 4) |
| `MIFUMO_SMS_API_KEY`, `MIFUMO_SMS_SENDER_ID` | Sending the invoice link by SMS |
| `APP_URL` | The domain in SMS links, if not the Vercel production domain |

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` / `npm run lint` | Checks |
| `npm run db:generate` | New migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Demo data (skips if a company already exists) |
