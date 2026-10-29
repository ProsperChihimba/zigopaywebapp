"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import type { FormState } from "@/components/form";

const { shipments, cargo } = schema;

const optionalDate = z.string().transform((s) => (s ? new Date(`${s}T00:00:00+03:00`) : null));
const input = z.object({
  shipmentNo: z.string().trim().min(3, "Enter a shipment number"),
  name: z.string().trim().transform((s) => s || null),
  type: z.enum(["sea", "air"], { error: "Choose sea or air" }),
  etd: optionalDate,
  eta: optionalDate,
});

export async function createShipment(_prev: FormState, formData: FormData): Promise<FormState> {
  const { companyId } = await requireUser();
  const values = Object.fromEntries(["shipmentNo", "name", "type", "etd", "eta"].map((k) => [k, String(formData.get(k) ?? "")]));
  const cargoIds = formData.getAll("cargoId").map(String);
  const parsed = input.safeParse(values);
  if (!parsed.success) {
    return { values, fields: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const d = parsed.data;
  if (d.etd && d.eta && d.eta < d.etd) return { values, fields: { eta: "ETA can't be before ETD" } };

  const taken = await db.query.shipments.findFirst({ where: and(eq(shipments.companyId, companyId), eq(shipments.shipmentNo, d.shipmentNo)) });
  if (taken) return { values, fields: { shipmentNo: "This shipment number is already used" } };

  const id = await db.transaction(async (tx) => {
    const [shipment] = await tx
      .insert(shipments)
      .values({ companyId, shipmentNo: d.shipmentNo, name: d.name, type: d.type, etd: d.etd, eta: d.eta, status: cargoIds.length ? "loaded" : "registered" })
      .returning();
    if (cargoIds.length) {
      // Only this company's cargo that is still in the warehouse and on no other shipment.
      await tx
        .update(cargo)
        .set({ shipmentId: shipment.id, status: "loaded" })
        .where(and(eq(cargo.companyId, companyId), inArray(cargo.id, cargoIds), isNull(cargo.shipmentId), eq(cargo.status, "received")));
    }
    return shipment.id;
  });
  redirect(`/shipments/${id}`);
}

/** How a shipment's status carries through to the cargo on it. */
const CARGO_STATUS_FOR = {
  registered: null,
  loaded: "loaded",
  in_transit: "in_transit",
  at_port: "in_transit",
  arrived: "arrived",
  off_loaded: "arrived",
} as const;

export async function updateShipmentStatus(formData: FormData) {
  const { companyId } = await requireUser();
  const id = String(formData.get("id"));
  const status = z.enum(["registered", "loaded", "in_transit", "at_port", "arrived", "off_loaded"]).parse(formData.get("status"));

  await db.transaction(async (tx) => {
    const [shipment] = await tx
      .update(shipments)
      .set({ status })
      .where(and(eq(shipments.id, id), eq(shipments.companyId, companyId)))
      .returning();
    const cargoStatus = CARGO_STATUS_FOR[status];
    if (shipment && cargoStatus) {
      // Cargo already handed to the customer keeps its status.
      await tx
        .update(cargo)
        .set({ status: cargoStatus })
        .where(and(eq(cargo.shipmentId, shipment.id), notInArray(cargo.status, ["delivered", "collected"])));
    }
  });
  revalidatePath(`/shipments/${id}`);
}
