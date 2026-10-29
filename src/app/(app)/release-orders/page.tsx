import Link from "next/link";
import { and, count, desc, eq, ilike, isNotNull, isNull, or } from "drizzle-orm";
import { ClipboardCheck, PackageCheck, Timer } from "lucide-react";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { Badge } from "@/components/badge";
import { PAGE_SIZE, Pagination, RowLink, Table, pageFrom } from "@/components/table";
import { formatDateTime } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { markCollectedAction } from "../payments/actions";

export const metadata = { title: "Release orders · Zigopay" };

const { releaseOrders, invoices, customers, users } = schema;

export default async function ReleaseOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; show?: string }> }) {
  const { companyId, role } = await requireUser();
  const { q = "", page: pageParam, show } = await searchParams;
  const page = pageFrom(pageParam);
  const mine = eq(releaseOrders.companyId, companyId);
  const where = and(
    mine,
    show === "waiting" ? isNull(releaseOrders.collectedAt) : show === "collected" ? isNotNull(releaseOrders.collectedAt) : undefined,
    q ? or(ilike(releaseOrders.releaseNo, `%${q}%`), ilike(invoices.invoiceNo, `%${q}%`), ilike(customers.name, `%${q}%`), ilike(customers.phone, `%${q.replace(/^0/, "")}%`)) : undefined,
  );
  const canHandOver = role === "admin" || role === "warehouse";

  const [rows, [{ total }], [{ all }], [{ waiting }]] = await Promise.all([
    db
      .select({ ro: releaseOrders, invoiceNo: invoices.invoiceNo, invoiceId: invoices.id, customerName: customers.name, phone: customers.phone, collectedBy: users.name })
      .from(releaseOrders)
      .innerJoin(invoices, eq(invoices.id, releaseOrders.invoiceId))
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .leftJoin(users, eq(users.id, releaseOrders.collectedBy))
      .where(where)
      .orderBy(desc(releaseOrders.issuedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(releaseOrders)
      .innerJoin(invoices, eq(invoices.id, releaseOrders.invoiceId))
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(where),
    db.select({ all: count() }).from(releaseOrders).where(mine),
    db.select({ waiting: count() }).from(releaseOrders).where(and(mine, isNull(releaseOrders.collectedAt))),
  ]);

  return (
    <>
      <PageHeader title="Release orders" q={q} />
      <StatGrid>
        <StatCard label="Release orders issued" value={all} icon={ClipboardCheck} tint="grey" />
        <StatCard label="Waiting for collection" value={waiting} icon={Timer} tint="orange" />
        <StatCard label="Collected" value={all - waiting} icon={PackageCheck} tint="green" />
      </StatGrid>
      <nav className="flex gap-2 px-6 py-4 text-sm" aria-label="Filter release orders">
        {[
          [undefined, "All"],
          ["waiting", "Waiting"],
          ["collected", "Collected"],
        ].map(([value, label]) => (
          <Link
            key={label}
            href={`?${new URLSearchParams({ ...(q && { q }), ...(value && { show: value }) })}`}
            className={`rounded-full border px-3 py-1 ${show === value ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Table
        head={["Issued", "Release no.", "Invoice", "Customer", "Phone", "Status", ""]}
        empty={rows.length === 0 ? (q ? `No release orders match "${q}".` : "No release orders yet. One is issued automatically when an invoice is fully paid.") : undefined}
      >
        {rows.map(({ ro, invoiceNo, invoiceId, customerName, phone, collectedBy }) => (
          <tr key={ro.id}>
            <td>{formatDateTime(ro.issuedAt)}</td>
            <td>
              <a href={`/r/${ro.pdfToken}`} target="_blank" rel="noreferrer" className="font-medium hover:text-brand hover:underline">
                {ro.releaseNo}
              </a>
            </td>
            <td>
              <RowLink href={`/invoices/${invoiceId}`}>{invoiceNo}</RowLink>
            </td>
            <td>{customerName}</td>
            <td>{displayPhone(phone)}</td>
            <td>{ro.collectedAt ? <Badge tone="grey">{`Collected ${formatDateTime(ro.collectedAt)}${collectedBy ? ` · ${collectedBy}` : ""}`}</Badge> : <Badge tone="green">Ready for collection</Badge>}</td>
            <td className="text-right">
              {!ro.collectedAt && canHandOver && (
                <form action={markCollectedAction}>
                  <input type="hidden" name="releaseOrderId" value={ro.id} />
                  <button className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark">Mark collected</button>
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} params={{ q, show }} />
    </>
  );
}
