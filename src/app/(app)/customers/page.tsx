import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { UserCheck, Users } from "lucide-react";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { qualified } from "@/db/sql";
import { PageHeader } from "@/components/page-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { Badge } from "@/components/badge";
import { PAGE_SIZE, Pagination, Table, pageFrom } from "@/components/table";
import { formatDateTime, formatNumber } from "@/lib/format";
import { displayPhone } from "@/lib/phone";

export const metadata = { title: "Customers · Zigopay" };

const { customers, cargo, invoices } = schema;

const customerId = qualified(customers.id);

// Cargo the customer still has with us (not yet collected).
const openCargo = sql<number>`(select count(*) from ${cargo} where ${cargo.customerId} = ${customerId} and ${cargo.status} <> 'collected')`.mapWith(Number);
const allCargo = sql<number>`(select count(*) from ${cargo} where ${cargo.customerId} = ${customerId})`.mapWith(Number);
const lastCargo = sql<Date | null>`(select max(${cargo.receivedAt}) from ${cargo} where ${cargo.customerId} = ${customerId})`.mapWith((v) => (v ? new Date(v) : null));
const owed = sql<string>`(select coalesce(sum(${invoices.totalTzs} - ${invoices.amountPaid}), 0) from ${invoices} where ${invoices.customerId} = ${customerId} and ${invoices.status} <> 'paid')`;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { companyId } = await requireUser();
  const { q = "", page: pageParam } = await searchParams;
  const page = pageFrom(pageParam);

  const where = and(
    eq(customers.companyId, companyId),
    q ? or(ilike(customers.name, `%${q}%`), ilike(customers.phone, `%${q.replace(/^0/, "")}%`)) : undefined,
  );

  const [rows, [{ total }], [{ all }], [{ active }]] = await Promise.all([
    db
      .select({ id: customers.id, createdAt: customers.createdAt, name: customers.name, phone: customers.phone, wallet: customers.walletBalance, openCargo, allCargo, lastCargo, owed })
      .from(customers)
      .where(where)
      .orderBy(desc(customers.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(customers).where(where),
    db.select({ all: count() }).from(customers).where(eq(customers.companyId, companyId)),
    db
      .select({ active: sql<number>`count(distinct ${cargo.customerId})`.mapWith(Number) })
      .from(cargo)
      .where(and(eq(cargo.companyId, companyId), sql`${cargo.status} <> 'collected'`)),
  ]);

  return (
    <>
      <PageHeader title="Customers" q={q} action={{ label: "New Customer", href: "/customers/new" }} />
      <StatGrid>
        <StatCard label="Customers" value={all} icon={Users} tint="grey" />
        <StatCard label="Active customers (cargo with us)" value={active} icon={UserCheck} tint="green" />
      </StatGrid>
      <Table
        head={["Registered", "Customer", "Customer phone", "Cargo status", "Last cargo", "All cargo", "Balance (TZS)", "Wallet (TZS)"]}
        empty={rows.length === 0 ? (q ? `No customers match "${q}".` : "No customers yet.") : undefined}
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{formatDateTime(r.createdAt)}</td>
            <td className="font-medium">{r.name}</td>
            <td>{displayPhone(r.phone)}</td>
            <td>{r.openCargo > 0 ? <Badge tone="orange">Has cargo ({r.openCargo})</Badge> : <span className="text-muted">-</span>}</td>
            <td>{formatDateTime(r.lastCargo)}</td>
            <td>{r.allCargo}</td>
            <td>{formatNumber(r.owed)}</td>
            <td>{formatNumber(r.wallet)}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} params={{ q }} />
    </>
  );
}
