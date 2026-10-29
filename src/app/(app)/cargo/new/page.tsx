import { and, asc, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { displayPhone } from "@/lib/phone";
import { CargoForm } from "./cargo-form";

export const metadata = { title: "New Cargo · Zigopay" };

/** "2026-10-29T14:05" in East Africa Time, for a datetime-local input. */
const eatNow = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 16);

export default async function NewCargoPage() {
  const { companyId } = await requireUser();
  const [customers, shipments] = await Promise.all([
    db.query.customers.findMany({ where: eq(schema.customers.companyId, companyId), orderBy: asc(schema.customers.name) }),
    db.query.shipments.findMany({
      where: and(eq(schema.shipments.companyId, companyId), inArray(schema.shipments.status, ["registered", "loaded"])),
      orderBy: asc(schema.shipments.shipmentNo),
    }),
  ]);

  return (
    <CargoForm
      now={eatNow()}
      customers={customers.map((c) => ({ name: c.name, phone: c.phone, localPhone: displayPhone(c.phone).replace(/\s/g, "") }))}
      shipments={shipments.map((s) => ({ id: s.id, label: `${s.shipmentNo} · ${s.type.toUpperCase()}${s.name ? ` · ${s.name}` : ""}` }))}
    />
  );
}
