import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { Badge } from "@/components/badge";
import { Table } from "@/components/table";
import { formatDate, formatNumber } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { CARGO_STATUS, SHIPMENT_STATUS, formatVolume } from "@/lib/labels";
import { shipmentTotals, totalVolume } from "@/lib/shipments";
import { updateShipmentStatus } from "../actions";

export const metadata = { title: "Shipment · Zigopay" };

const { shipments, cargo, customers } = schema;

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [found] = await db
    .select({ s: shipments, ...shipmentTotals })
    .from(shipments)
    .where(and(eq(shipments.id, id), eq(shipments.companyId, companyId)));
  if (!found) notFound();
  const { s } = found;

  const items = await db
    .select({ cargo, customerName: customers.name, customerPhone: customers.phone })
    .from(cargo)
    .innerJoin(customers, eq(customers.id, cargo.customerId))
    .where(eq(cargo.shipmentId, s.id))
    .orderBy(asc(customers.name));

  const facts = [
    ["Type", s.type.toUpperCase()],
    ["ETD", formatDate(s.etd)],
    ["ETA", formatDate(s.eta)],
    ["Cargo", String(found.cargoCount)],
    ["Total volume", totalVolume(found.cbm, found.kg)],
    ["Total value ($)", formatNumber(found.valueUsd)],
  ];

  return (
    <>
      <header className="border-b border-line px-6 py-5">
        <Link href="/shipments" className="inline-flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" /> Shipments
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{s.shipmentNo}</h1>
          <Badge tone={SHIPMENT_STATUS[s.status].tone}>{SHIPMENT_STATUS[s.status].label}</Badge>
          {s.name && <span className="text-sm text-muted">{s.name}</span>}
          <form action={updateShipmentStatus} key={s.status} className="ml-auto flex items-center gap-2">
            <input type="hidden" name="id" value={s.id} />
            <label className="text-sm text-muted" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" defaultValue={s.status} className="rounded-lg border border-line px-3 py-2 text-sm">
              {Object.entries(SHIPMENT_STATUS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Update</button>
          </form>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted">Changing the status updates every cargo on this shipment, except cargo already delivered or collected.</p>
      </header>
      <h2 className="px-6 pt-6 text-sm font-medium">Packing list</h2>
      <Table head={["Tracking number", "Customer", "Phone", "Packages", "Volume", "Value ($)", "Description", "Cargo status"]} empty={items.length === 0 ? "No cargo on this shipment yet." : undefined}>
        {items.map(({ cargo: c, customerName, customerPhone }) => (
          <tr key={c.id}>
            <td className="font-medium">{c.trackingNo}</td>
            <td>{customerName}</td>
            <td>{displayPhone(customerPhone)}</td>
            <td>{c.packages}</td>
            <td>{formatVolume(c.volume, c.volumeUnit)}</td>
            <td>{formatNumber(c.valueUsd)}</td>
            <td className="max-w-48 truncate">{c.description ?? "-"}</td>
            <td>
              <Badge tone={CARGO_STATUS[c.status].tone}>{CARGO_STATUS[c.status].label}</Badge>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
