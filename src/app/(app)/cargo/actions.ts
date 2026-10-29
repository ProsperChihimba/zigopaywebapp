"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { normalizePhone } from "@/lib/phone";
import { newTrackingNo } from "@/lib/ids";
import { findOrCreateCustomer } from "@/lib/customers";
import type { FormState } from "@/components/form";

const FIELDS = [
  "receivedAt", "supplier", "supplierTrackingNo", "orderNo", "packages", "volumeUnit", "volume", "cargoType",
  "valueUsd", "description", "customerPhone", "customerName", "destinationCountry", "shipmentId", "trackingNo",
] as const;

const optional = z.string().trim().transform((s) => s || null);
const input = z.object({
  receivedAt: z.string().min(1, "Choose the date received"),
  supplier: optional,
  supplierTrackingNo: optional,
  orderNo: optional,
  packages: z.coerce.number({ error: "Enter the number of packages" }).int("Whole packages only").min(1, "At least 1 package"),
  volumeUnit: z.enum(["cbm", "kg"], { error: "Choose cbm or kg" }),
  volume: z.coerce.number({ error: "Enter the volume" }).positive("Volume must be more than 0"),
  cargoType: optional,
  valueUsd: z.union([z.literal(""), z.coerce.number().nonnegative("Value can't be negative")]),
  description: optional,
  customerPhone: z.string().trim().min(1, "Enter the customer's phone"),
  customerName: z.string().trim(),
  destinationCountry: z.string().trim().transform((s) => s || "Tanzania"),
  shipmentId: optional,
  trackingNo: optional,
});

export async function createCargo(_prev: FormState, formData: FormData): Promise<FormState> {
  const { companyId } = await requireUser();
  const values = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = input.safeParse(values);
  if (!parsed.success) {
    return { values, fields: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const d = parsed.data;

  const phone = normalizePhone(d.customerPhone);
  if (!phone) return { values, fields: { customerPhone: "Enter a valid phone number, e.g. 0712 345 678" } };

  const known = await db.query.customers.findFirst({ where: and(eq(schema.customers.companyId, companyId), eq(schema.customers.phone, phone)) });
  if (!known && d.customerName.length < 2) return { values, fields: { customerName: "New customer: enter their name" } };

  if (d.shipmentId) {
    const shipment = await db.query.shipments.findFirst({ where: and(eq(schema.shipments.id, d.shipmentId), eq(schema.shipments.companyId, companyId)) });
    if (!shipment) return { values, fields: { shipmentId: "Choose a shipment from the list" } };
  }

  const trackingNo = d.trackingNo ?? newTrackingNo();
  const duplicate = await db.query.cargo.findFirst({ where: and(eq(schema.cargo.companyId, companyId), eq(schema.cargo.trackingNo, trackingNo)) });
  if (duplicate) return { values, fields: { trackingNo: "This tracking number is already used" } };

  await db.transaction(async (tx) => {
    const customer = known ?? (await findOrCreateCustomer(tx, companyId, phone, d.customerName, d.destinationCountry));
    await tx.insert(schema.cargo).values({
      companyId,
      customerId: customer.id,
      shipmentId: d.shipmentId,
      trackingNo,
      receivedAt: new Date(`${d.receivedAt}+03:00`),
      supplier: d.supplier,
      supplierTrackingNo: d.supplierTrackingNo,
      orderNo: d.orderNo,
      packages: d.packages,
      volume: String(d.volume),
      volumeUnit: d.volumeUnit,
      cargoType: d.cargoType,
      valueUsd: d.valueUsd === "" ? null : String(d.valueUsd),
      description: d.description,
      status: d.shipmentId ? "loaded" : "received",
    });
  });
  redirect("/cargo");
}
