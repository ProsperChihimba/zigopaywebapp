import { and, count, desc, eq, gte, ilike, isNull, or, sum } from "drizzle-orm";
import { CalendarDays, CircleAlert, Download, HandCoins, Receipt } from "lucide-react";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { Badge } from "@/components/badge";
import { PAGE_SIZE, Pagination, RowLink, Table, pageFrom } from "@/components/table";
import { formatDateTime, formatNumber } from "@/lib/format";
import { eatStarts } from "@/lib/time";

export const metadata = { title: "Payments · Zigopay" };

const { payments, invoices, customers } = schema;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { companyId } = await requireUser();
  const { q = "", page: pageParam } = await searchParams;
  const page = pageFrom(pageParam);
  const { day, month } = eatStarts();
  const mine = eq(payments.companyId, companyId);
  const where = and(
    mine,
    q ? or(ilike(payments.payerName, `%${q}%`), ilike(payments.collectionId, `%${q}%`), ilike(invoices.invoiceNo, `%${q}%`), ilike(customers.name, `%${q}%`)) : undefined,
  );

  const [rows, [{ total }], [today], [thisMonth], [unmatched]] = await Promise.all([
    db
      .select({ p: payments, invoiceNo: invoices.invoiceNo, invoiceId: invoices.id, customerName: customers.name })
      .from(payments)
      .leftJoin(invoices, eq(invoices.id, payments.invoiceId))
      .leftJoin(customers, eq(customers.id, invoices.customerId))
      .where(where)
      .orderBy(desc(payments.receivedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(payments)
      .leftJoin(invoices, eq(invoices.id, payments.invoiceId))
      .leftJoin(customers, eq(customers.id, invoices.customerId))
      .where(where),
    db.select({ amount: sum(payments.amount), n: count() }).from(payments).where(and(mine, gte(payments.receivedAt, day))),
    db.select({ amount: sum(payments.amount), n: count() }).from(payments).where(and(mine, gte(payments.receivedAt, month))),
    db.select({ n: count() }).from(payments).where(and(mine, isNull(payments.invoiceId))),
  ]);

  return (
    <>
      <PageHeader title="Payments" q={q} />
      <StatGrid>
        <StatCard label={`Collected today (${today.n})`} value={`TZS ${formatNumber(today.amount ?? 0)}`} icon={HandCoins} tint="green" />
        <StatCard label={`Collected this month (${thisMonth.n})`} value={`TZS ${formatNumber(thisMonth.amount ?? 0)}`} icon={CalendarDays} tint="blue" />
        <StatCard label="Payments recorded" value={total} icon={Receipt} tint="grey" />
        <StatCard label="Not matched to an invoice" value={unmatched.n} icon={CircleAlert} tint={unmatched.n ? "orange" : "grey"} />
      </StatGrid>
      <div className="flex justify-end px-6 py-4">
        <a href="/payments/export" className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-tint-grey">
          <Download className="h-4 w-4" /> Download CSV
        </a>
      </div>
      <Table
        head={["Received", "Amount (TZS)", "Invoice", "Customer", "Payer", "Payer bank", "To wallet (TZS)", "Source", "Daraja collection"]}
        empty={rows.length === 0 ? (q ? `No payments match "${q}".` : "No payments yet. They appear here as soon as Daraja reports them.") : undefined}
      >
        {rows.map(({ p, invoiceNo, invoiceId, customerName }) => (
          <tr key={p.id}>
            <td>{formatDateTime(p.receivedAt)}</td>
            <td className="font-medium">{formatNumber(p.amount)}</td>
            <td>{invoiceId ? <RowLink href={`/invoices/${invoiceId}`}>{invoiceNo}</RowLink> : <Badge tone="orange">{`Unmatched${p.reference ? ` · ${p.reference}` : ""}`}</Badge>}</td>
            <td>{customerName ?? "-"}</td>
            <td>{p.payerName ?? "-"}</td>
            <td>{p.payerBank ?? "-"}</td>
            <td>{Number(p.toWallet) > 0 ? formatNumber(p.toWallet) : "-"}</td>
            <td>{p.source === "webhook" ? <Badge tone="blue">Daraja</Badge> : <Badge tone="yellow">Manual</Badge>}</td>
            <td className="text-xs text-muted">{p.collectionId ?? "-"}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} params={{ q }} />
    </>
  );
}
