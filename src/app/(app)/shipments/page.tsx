import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { Anchor, PackageOpen, Ship, Truck } from "lucide-react";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { Badge } from "@/components/badge";
import { PAGE_SIZE, Pagination, RowLink, Table, pageFrom } from "@/components/table";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { SHIPMENT_STATUS } from "@/lib/labels";
import { shipmentTotals, totalVolume } from "@/lib/shipments";

export const metadata = { title: "Shipment Management · Zigopay" };

const { shipments } = schema;
type Status = keyof typeof SHIPMENT_STATUS;

export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { companyId } = await requireUser();
  const { q = "", page: pageParam } = await searchParams;
  const page = pageFrom(pageParam);
  const where = and(eq(shipments.companyId, companyId), q ? or(ilike(shipments.shipmentNo, `%${q}%`), ilike(shipments.name, `%${q}%`)) : undefined);

  const [rows, [{ total }], byStatus] = await Promise.all([
    db
      .select({ s: shipments, ...shipmentTotals })
      .from(shipments)
      .where(where)
      .orderBy(desc(shipments.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(shipments).where(where),
    db.select({ status: shipments.status, n: count() }).from(shipments).where(eq(shipments.companyId, companyId)).groupBy(shipments.status),
  ]);
  const n = (s: Status) => byStatus.find((r) => r.status === s)?.n ?? 0;

  return (
    <>
      <PageHeader title="Shipment Management" q={q} action={{ label: "New Shipment", href: "/shipments/new" }} />
      <StatGrid>
        <StatCard label="Loaded shipments" value={n("loaded")} icon={Ship} tint="grey" />
        <StatCard label="In transit" value={n("in_transit") + n("at_port")} icon={Truck} tint="green" />
        <StatCard label="Arrived shipments" value={n("arrived")} icon={Anchor} tint="blue" />
        <StatCard label="Off-loaded shipments" value={n("off_loaded")} icon={PackageOpen} tint="yellow" />
      </StatGrid>
      <Table
        head={["Registered", "Shipment", "Cargo", "Status", "Volume", "ETD", "ETA", "Shipment type", "Shipment value ($)"]}
        empty={rows.length === 0 ? (q ? `No shipments match "${q}".` : "No shipments yet.") : undefined}
      >
        {rows.map(({ s, cargoCount, cbm, kg, valueUsd }) => (
          <tr key={s.id}>
            <td>{formatDateTime(s.createdAt)}</td>
            <td>
              <RowLink href={`/shipments/${s.id}`}>{s.shipmentNo}</RowLink>
            </td>
            <td>{cargoCount}</td>
            <td>
              <Badge tone={SHIPMENT_STATUS[s.status].tone}>{SHIPMENT_STATUS[s.status].label}</Badge>
            </td>
            <td>{totalVolume(cbm, kg)}</td>
            <td>{formatDate(s.etd)}</td>
            <td>{formatDate(s.eta)}</td>
            <td>{s.type.toUpperCase()}</td>
            <td>{formatNumber(valueUsd)}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} total={total} params={{ q }} />
    </>
  );
}
