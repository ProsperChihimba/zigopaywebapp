import { and, desc, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { newShipmentNo } from "@/lib/ids";
import { ShipmentForm } from "./shipment-form";

export const metadata = { title: "New Shipment · Zigopay" };

export default async function NewShipmentPage() {
  const { companyId } = await requireUser();
  const { cargo, customers } = schema;
  const rows = await db
    .select({ cargo, customerName: customers.name })
    .from(cargo)
    .innerJoin(customers, eq(customers.id, cargo.customerId))
    .where(and(eq(cargo.companyId, companyId), eq(cargo.status, "received"), isNull(cargo.shipmentId)))
    .orderBy(desc(cargo.receivedAt));

  return (
    <ShipmentForm
      suggestedNo={newShipmentNo()}
      available={rows.map(({ cargo: c, customerName }) => ({
        id: c.id,
        trackingNo: c.trackingNo,
        customerName,
        packages: c.packages,
        volume: Number(c.volume),
        unit: c.volumeUnit,
        valueUsd: Number(c.valueUsd ?? 0),
      }))}
    />
  );
}
