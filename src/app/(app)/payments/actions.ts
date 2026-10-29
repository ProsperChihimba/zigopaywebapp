"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/auth";
import { applyPayment } from "@/lib/payments";
import { markCollected, notifyAfterPayment, sendReleaseOrder } from "@/lib/release-orders";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import type { FormState } from "@/components/form";

const manual = z.object({
  invoiceId: z.uuid(),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount in TZS, e.g. 150000"),
  receivedAt: z.string().min(1, "Choose when it was received"),
  payerName: z.string().trim().max(120),
  note: z.string().trim().min(5, "Say where this payment was confirmed, e.g. which Daraja ops message").max(500),
});

/** For a payment Daraja's webhook never delivered. Recorded as manual, with who entered it. */
export async function recordManualPaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("admin", "finance");
  const values = Object.fromEntries(["invoiceId", "amount", "receivedAt", "payerName", "note"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = manual.safeParse(values);
  if (!parsed.success) return { values, fields: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const d = parsed.data;

  const outcome = await applyPayment({
    source: "manual",
    invoiceId: d.invoiceId,
    companyId: user.companyId,
    amount: d.amount,
    receivedAt: new Date(`${d.receivedAt}+03:00`),
    payerName: d.payerName || null,
    note: d.note,
    recordedBy: user.id,
  });
  if (outcome.kind === "invalid") return { values, error: outcome.error };
  if (outcome.kind === "recorded") after(() => notifyAfterPayment(outcome));
  revalidatePath(`/invoices/${d.invoiceId}`);
  const notice = outcome.kind === "duplicate" ? "Already recorded." : "Payment recorded.";
  return { values: {}, notice };
}

export async function resendReleaseOrderAction(formData: FormData) {
  const user = await requireRole("admin", "finance", "warehouse");
  const id = z.uuid().parse(formData.get("releaseOrderId"));
  const channel = z.enum(["whatsapp", "sms"]).parse(formData.get("channel"));
  const ro = await db.query.releaseOrders.findFirst({ where: and(eq(schema.releaseOrders.id, id), eq(schema.releaseOrders.companyId, user.companyId)) });
  if (!ro) throw new Error("Release order not found");
  await sendReleaseOrder(ro.id, [channel]);
  revalidatePath(`/invoices/${ro.invoiceId}`);
}

export async function markCollectedAction(formData: FormData) {
  const user = await requireRole("admin", "warehouse");
  const id = z.uuid().parse(formData.get("releaseOrderId"));
  await markCollected(id, user.companyId, user.id);
  revalidatePath("/release-orders");
}
