import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { CircleCheck, CircleDashed, FileText, Hourglass } from "lucide-react";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { qualified } from "@/db/sql";
import { PageHeader } from "@/components/page-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { Badge } from "@/components/badge";
import { PAGE_SIZE, Pagination, RowLink, Table, pageFrom } from "@/components/table";
import { formatDateTime, formatNumber } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { ACCOUNT_STATUS, INVOICE_STATUS } from "@/lib/invoice-labels";

export const metadata = { title: "Invoices · Zigopay" };

const { invoices, customers, collectionAccounts, messages } = schema;
const invoiceId = qualified(invoices.id);
const sentBy = (channel: "sms" | "whatsapp") =>
  sql<boolean>`exists (select 1 from ${messages} where ${messages.invoiceId} = ${invoiceId} and ${messages.channel} = ${channel} and ${messages.status} = 'sent')`;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { companyId } = await requireUser();
  const { q = "", page: pageParam } = await searchParams;
  const page = pageFrom(pageParam);
  const where = and(
    eq(invoices.companyId, companyId),
    q ? or(ilike(invoices.invoiceNo, `%${q}%`), ilike(customers.name, `%${q}%`), ilike(customers.phone, `%${q.replace(/^0/, "")}%`), ilike(collectionAccounts.bankAccountNo, `%${q}%`)) : undefined,
  );

  const [rows, [{ total }], byStatus] = await Promise.all([
    db
      .select({ invoice: invoices, customerName: customers.name, phone: customers.phone, account: collectionAccounts, sms: sentBy("sms"), whatsapp: sentBy("whatsapp") })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .leftJoin(collectionAccounts, eq(collectionAccounts.invoiceId, invoices.id))
      .where(where)
      .orderBy(desc(invoices.issuedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .leftJoin(collectionAccounts, eq(collectionAccounts.invoiceId, invoices.id))
      .where(where),
    db.select({ status: invoices.status, n: count() }).from(invoices).where(eq(invoices.companyId, companyId)).groupBy(invoices.status),
  ]);
  const n = (s: keyof typeof INVOICE_STATUS) => byStatus.find((r) => r.status === s)?.n ?? 0;

  return (
    <>
      <PageHeader title="Invoices" q={q} action={{ label: "Create invoice", href: "/invoices/new" }} />
      <StatGrid>
        <StatCard label="Invoices" value={n("unpaid") + n("partly_paid") + n("paid")} icon={FileText} tint="grey" />
        <StatCard label="Paid" value={n("paid")} icon={CircleCheck} tint="green" />
        <StatCard label="Partly paid" value={n("partly_paid")} icon={Hourglass} tint="yellow" />
        <StatCard label="Unpaid" value={n("unpaid")} icon={CircleDashed} tint="orange" />
      </StatGrid>
      <Table
        head={["Issued", "Invoice #", "Customer", "Customer phone", "Total (TZS)", "Paid (TZS)", "Balance (TZS)", "Status", "TCB account", "Sent"]}
        empty={rows.length === 0 ? (q ? `No invoices match "${q}".` : "No invoices yet. Create one from cargo waiting to be billed.") : undefined}
      >
        {rows.map(({ invoice: i, customerName, phone, account, sms, whatsapp }) => (
          <tr key={i.id}>
            <td>{formatDateTime(i.issuedAt)}</td>
            <td>
              <RowLink href={`/invoices/${i.id}`}>{i.invoiceNo}</RowLink>
            </td>
            <td>{customerName}</td>
            <td>{displayPhone(phone)}</td>
            <td>{formatNumber(i.totalTzs)}</td>
            <td>{formatNumber(i.amountPaid)}</td>
            <td>{formatNumber(Number(i.totalTzs) - Number(i.amountPaid))}</td>
            <td>
              <Badge tone={INVOICE_STATUS[i.status].tone}>{INVOICE_STATUS[i.status].label}</Badge>
            </td>
            <td>{account?.status === "created" ? account.bankAccountNo : account ? <Badge tone={ACCOUNT_STATUS[account.status].tone}>{ACCOUNT_STATUS[account.status].label}</Badge> : "-"}</td>
            <td className="text-xs">
              <span className={whatsapp ? "text-brand" : "text-muted"}>WhatsApp {whatsapp ? "✓" : "–"}</span>
              <span className="mx-1 text-line">|</span>
              <span className={sms ? "text-brand" : "text-muted"}>SMS {sms ? "✓" : "–"}</span>
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} params={{ q }} />
    </>
  );
}
