"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { normalizePhone } from "@/lib/phone";
import type { FormState } from "@/components/form";

const input = z.object({
  name: z.string().trim().min(2, "Enter the customer's name"),
  phone: z.string().trim().min(1, "Enter a phone number"),
  destinationCountry: z.string().trim().min(1, "Choose a country"),
});

export async function createCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const { companyId } = await requireUser();
  const values = Object.fromEntries(["name", "phone", "destinationCountry"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = input.safeParse(values);
  if (!parsed.success) {
    return { values, fields: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { values, fields: { phone: "Enter a valid phone number, e.g. 0712 345 678" } };

  const taken = await db.query.customers.findFirst({
    where: and(eq(schema.customers.companyId, companyId), eq(schema.customers.phone, phone)),
  });
  if (taken) return { values, fields: { phone: `This number already belongs to ${taken.name}` } };

  await db.insert(schema.customers).values({ companyId, name: parsed.data.name, phone, destinationCountry: parsed.data.destinationCountry });
  redirect("/customers");
}
