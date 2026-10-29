import Link from "next/link";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { PackageCheck, PackageOpen, Truck, Warehouse } from "lucide-react";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { Badge } from "@/components/badge";
import { PAGE_SIZE, Pagination, Table, pageFrom } from "@/components/table";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { CARGO_STATUS, formatVolume } from "@/lib/labels";

export const metadata = { title: "Cargo Management · Zigopay" };

const { cargo, customers, shipments } = schema;
type Status = keyof typeof CARGO_STATUS;
const STATUSES = Object.keys(CARGO_STATUS) as Status[];

export default async function CargoPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string }> }) {
  const { companyId } = await requireUser();
  const { q = "", page: pageParam, status: statusParam } = await searchParams;
  const page = pageFrom(pageParam);
  const status = STATUSES.includes(statusParam as Status) ? (statusParam as Status) : undefined;

  const where = and(
    eq(cargo.companyId, companyId),
    status ? eq(cargo.status, status) : undefined,
    q
      ? or(
          ilike(cargo.trackingNo, `%${q}%`),
          ilike(cargo.description, `%${q}%`),
          ilike(customers.name, `%${q}%`),
          ilike(customers.phone, `%${q.replace(/^0/, "")}%`),
          ilike(shipments.shipmentNo, `%${q}%`),
        )
      : undefined,
  );

  const [rows, [{ total }], byStatus] = await Promise.all([
    db
      .select({ cargo, customerName: customers.name, customerPhone: customers.phone, shipmentNo: shipments.shipmentNo, etd: shipments.etd, eta: shipments.eta })
      .from(cargo)
      .innerJoin(customers, eq(customers.id, cargo.customerId))
      .leftJoin(shipments, eq(shipments.id, cargo.shipmentId))
      .where(where)
      .orderBy(desc(cargo.receivedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(cargo)
      .innerJoin(customers, eq(customers.id, cargo.customerId))
      .leftJoin(shipments, eq(shipments.id, cargo.shipmentId))
      .where(where),
    db.select({ status: cargo.status, n: count() }).from(cargo).where(eq(cargo.companyId, companyId)).groupBy(cargo.status),
  ]);
  const n = (s: Status) => byStatus.find((r) => r.status === s)?.n ?? 0;

  return (
    <>
      <PageHeader title="Cargo Management" q={q} action={{ label: "New Cargo", href: "/cargo/new" }} />
      <StatGrid>
        <StatCard label="Received cargo (in warehouse)" value={n("received")} icon={Warehouse} tint="orange" />
        <StatCard label="Loaded or in transit" value={n("loaded") + n("in_transit")} icon={Truck} tint="green" />
        <StatCard label="Arrived or delivered" value={n("arrived") + n("delivered")} icon={PackageOpen} tint="blue" />
        <StatCard label="Collected cargo" value={n("collected")} icon={PackageCheck} tint="yellow" />
      </StatGrid>
      <nav className="flex gap-2 overflow-x-auto px-6 py-4 text-sm" aria-label="Filter by status">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={`?${new URLSearchParams({ ...(q && { q }), ...(s && { status: s }) })}`}
            className={`shrink-0 rounded-full border px-3 py-1 ${status === s ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink"}`}
          >
            {s ? CARGO_STATUS[s].label : "All"}
          </Link>
        ))}
      </nav>
      <Table
        head={["Receipt date", "Shipment number", "Tracking number", "Status", "Customer", "Customer phone", "No. of packages", "Volume", "Value ($)", "Description", "ETD", "ETA"]}
        empty={rows.length === 0 ? (q || status ? "No cargo matches this search." : "No cargo yet. Record the first one with New Cargo.") : undefined}
      >
        {rows.map(({ cargo: c, customerName, customerPhone, shipmentNo, etd, eta }) => (
          <tr key={c.id}>
            <td>{formatDateTime(c.receivedAt)}</td>
            <td>{shipmentNo ?? "-"}</td>
            <td className="font-medium">{c.trackingNo}</td>
            <td>
              <Badge tone={CARGO_STATUS[c.status].tone}>{CARGO_STATUS[c.status].label}</Badge>
            </td>
            <td>{customerName}</td>
            <td>{displayPhone(customerPhone)}</td>
            <td>{c.packages}</td>
            <td>{formatVolume(c.volume, c.volumeUnit)}</td>
            <td>{formatNumber(c.valueUsd)}</td>
            <td className="max-w-48 truncate">{c.description ?? "-"}</td>
            <td>{formatDate(etd)}</td>
            <td>{formatDate(eta)}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} params={{ q, status }} />
    </>
  );
}
