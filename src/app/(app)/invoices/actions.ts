"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { createInvoice, ensureCollectionAccount, processNewInvoice, sendInvoice } from "@/lib/invoices";
import type { FormState } from "@/components/form";

const uuid = z.uuid();

export async function createInvoiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const customerId = String(formData.get("customerId") ?? "");
  const cargoIds = formData.getAll("cargoId").map(String);
  const values: Record<string, string> = { usdRate: String(formData.get("usdRate") ?? "") };
  for (const id of cargoIds) values[`price_${id}`] = String(formData.get(`price_${id}`) ?? "");

  if (!uuid.safeParse(customerId).success) return { values, error: "Choose a customer." };
  if (cargoIds.length === 0) return { values, error: "Tick at least one cargo to invoice." };
  const usdRate = Number(values.usdRate);
  if (!(usdRate > 0)) return { values, fields: { usdRate: "Enter the exchange rate, e.g. 2700" } };

  const fields: Record<string, string> = {};
  const lines = cargoIds.map((cargoId) => {
    const priceUsd = Number(values[`price_${cargoId}`]);
    if (!uuid.safeParse(cargoId).success || !(priceUsd > 0)) fields[`price_${cargoId}`] = "Enter a price above 0";
    return { cargoId, priceUsd };
  });
  if (Object.keys(fields).length) return { values, fields, error: "Every ticked cargo needs a price." };

  const customer = await db.query.customers.findFirst({ where: and(eq(schema.customers.id, customerId), eq(schema.customers.companyId, user.companyId)) });
  if (!customer) return { values, error: "That customer was not found." };

  const result = await createInvoice({ companyId: user.companyId, customerId, usdRate, lines, createdBy: user.id });
  if ("error" in result) return { values, error: result.error };

  // Opening the bank account and sending can take a while: do it after answering.
  after(() => processNewInvoice(result.id));
  redirect(`/invoices/${result.id}`);
}

async function ownInvoice(formData: FormData) {
  const { companyId } = await requireUser();
  const id = uuid.parse(formData.get("invoiceId"));
  const invoice = await db.query.invoices.findFirst({ where: and(eq(schema.invoices.id, id), eq(schema.invoices.companyId, companyId)) });
  if (!invoice) throw new Error("Invoice not found");
  return invoice;
}

/** Tries again to open the account after an ordinary failure. Never used for "uncertain". */
export async function retryAccountAction(formData: FormData) {
  const invoice = await ownInvoice(formData);
  const account = await ensureCollectionAccount(invoice.id);
  if (account?.status === "created") await sendInvoice(invoice.id);
  revalidatePath(`/invoices/${invoice.id}`);
}

export async function resendAction(formData: FormData) {
  const invoice = await ownInvoice(formData);
  const channel = z.enum(["whatsapp", "sms"]).parse(formData.get("channel"));
  await sendInvoice(invoice.id, [channel]);
  revalidatePath(`/invoices/${invoice.id}`);
}
