import Link from "next/link";
import { and, asc, count, desc, eq, gte, inArray, isNull, sql, sum } from "drizzle-orm";
import { CalendarDays, ClipboardCheck, FileText, HandCoins } from "lucide-react";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { Badge } from "@/components/badge";
import { formatDateTime, formatNumber } from "@/lib/format";
import { eatStarts } from "@/lib/time";
import { INVOICE_STATUS } from "@/lib/invoice-labels";

export const metadata = { title: "Dashboard · Zigopay" };

const { payments, invoices, customers, releaseOrders, cargo, invoiceItems } = schema;

function Panel({ title, href, children, empty }: { title: string; href: string; children: React.ReactNode; empty?: string }) {
  return (
    <section className="min-w-0 rounded-2xl border border-line">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Link href={href} className="text-sm text-brand hover:underline">
          View all
        </Link>
      </header>
      {empty ? <p className="px-5 py-10 text-center text-sm text-muted">{empty}</p> : <ul className="divide-y divide-line">{children}</ul>}
    </section>
  );
}

export default async function DashboardPage() {
  const { companyId } = await requireUser();
  const { day, month } = eatStarts();
  const owing = and(eq(invoices.companyId, companyId), inArray(invoices.status, ["unpaid", "partly_paid"]));

  const [[today], [thisMonth], [due], [waiting], [uninvoiced], recent, unpaid, toCollect] = await Promise.all([
    db.select({ amount: sum(payments.amount), n: count() }).from(payments).where(and(eq(payments.companyId, companyId), gte(payments.receivedAt, day))),
    db.select({ amount: sum(payments.amount), n: count() }).from(payments).where(and(eq(payments.companyId, companyId), gte(payments.receivedAt, month))),
    db.select({ n: count(), owed: sql<string>`coalesce(sum(${invoices.totalTzs} - ${invoices.amountPaid}), 0)` }).from(invoices).where(owing),
    db.select({ n: count() }).from(releaseOrders).where(and(eq(releaseOrders.companyId, companyId), isNull(releaseOrders.collectedAt))),
    db
      .select({ n: count() })
      .from(cargo)
      .leftJoin(invoiceItems, eq(invoiceItems.cargoId, cargo.id))
      .where(and(eq(cargo.companyId, companyId), isNull(invoiceItems.id))),
    db
      .select({ p: payments, invoiceNo: invoices.invoiceNo, invoiceId: invoices.id, customerName: customers.name })
      .from(payments)
      .leftJoin(invoices, eq(invoices.id, payments.invoiceId))
      .leftJoin(customers, eq(customers.id, invoices.customerId))
      .where(eq(payments.companyId, companyId))
      .orderBy(desc(payments.receivedAt))
      .limit(6),
    db
      .select({ i: invoices, customerName: customers.name })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(owing)
      .orderBy(asc(invoices.issuedAt))
      .limit(6),
    db
      .select({ ro: releaseOrders, customerName: customers.name })
      .from(releaseOrders)
      .innerJoin(invoices, eq(invoices.id, releaseOrders.invoiceId))
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(and(eq(releaseOrders.companyId, companyId), isNull(releaseOrders.collectedAt)))
      .orderBy(asc(releaseOrders.issuedAt))
      .limit(6),
  ]);

  return (
    <>
      <PageHeader title="Dashboard" />
      <StatGrid>
        <StatCard label={`Collected today (${today.n} ${today.n === 1 ? "payment" : "payments"})`} value={`TZS ${formatNumber(today.amount ?? 0)}`} icon={HandCoins} tint="green" />
        <StatCard label={`Collected this month (${thisMonth.n})`} value={`TZS ${formatNumber(thisMonth.amount ?? 0)}`} icon={CalendarDays} tint="blue" />
        <StatCard label={`Owed on ${due.n} open ${due.n === 1 ? "invoice" : "invoices"}`} value={`TZS ${formatNumber(due.owed)}`} icon={FileText} tint="yellow" />
        <StatCard label="Goods waiting for collection" value={waiting.n} icon={ClipboardCheck} tint="orange" />
      </StatGrid>

      {uninvoiced.n > 0 && (
        <p className="mx-6 mt-6 rounded-xl bg-tint-grey px-4 py-3 text-sm">
          {uninvoiced.n} cargo {uninvoiced.n === 1 ? "is" : "are"} not on an invoice yet.{" "}
          <Link href="/invoices/new" className="font-medium text-brand hover:underline">
            Create an invoice
          </Link>
        </p>
      )}

      <div className="grid gap-6 p-6 xl:grid-cols-3">
        <Panel title="Recent payments" href="/payments" empty={recent.length ? undefined : "No payments yet."}>
          {recent.map(({ p, invoiceNo, invoiceId, customerName }) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{customerName ?? p.payerName ?? "Unmatched payment"}</span>
                <span className="text-xs text-muted">
                  {invoiceId ? (
                    <Link href={`/invoices/${invoiceId}`} className="hover:underline">
                      {invoiceNo}
                    </Link>
                  ) : (
                    "No invoice"
                  )}{" "}
                  · {formatDateTime(p.receivedAt)}
                </span>
              </span>
              <span className="shrink-0 font-semibold">{formatNumber(p.amount)}</span>
            </li>
          ))}
        </Panel>

        <Panel title="Awaiting payment (oldest first)" href="/invoices" empty={unpaid.length ? undefined : "Every invoice is paid."}>
          {unpaid.map(({ i, customerName }) => (
            <li key={i.id} className="px-5 py-3 text-sm">
              <Link href={`/invoices/${i.id}`} className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{customerName}</span>
                  <span className="text-xs text-muted">
                    {i.invoiceNo} · {formatDateTime(i.issuedAt)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold">{formatNumber(Number(i.totalTzs) - Number(i.amountPaid))}</span>
                  <Badge tone={INVOICE_STATUS[i.status].tone}>{INVOICE_STATUS[i.status].label}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </Panel>

        <Panel title="Ready for collection" href="/release-orders?show=waiting" empty={toCollect.length ? undefined : "Nothing waiting at the warehouse."}>
          {toCollect.map(({ ro, customerName }) => (
            <li key={ro.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{customerName}</span>
                <span className="text-xs text-muted">Issued {formatDateTime(ro.issuedAt)}</span>
              </span>
              <span className="shrink-0 font-semibold tracking-wide">{ro.releaseNo}</span>
            </li>
          ))}
        </Panel>
      </div>
    </>
  );
}
