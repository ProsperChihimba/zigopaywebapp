import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { appUrl } from "@/lib/urls";
import { logMessage, shillings } from "@/lib/messages";
import { sendSms } from "@/lib/integrations/sms";
import { sendWhatsAppDocument } from "@/lib/integrations/whatsapp";

const { releaseOrders, invoices, invoiceItems, customers, companies, collectionAccounts, payments, cargo } = schema;

export const releaseOrderPdfUrl = (token: string) => `${appUrl()}/r/${token}`;

/** Sends the release order: the PDF by WhatsApp and a link by SMS. */
export async function sendReleaseOrder(releaseOrderId: string, channels: ("whatsapp" | "sms")[] = ["whatsapp", "sms"]) {
  const [row] = await db
    .select({ ro: releaseOrders, invoice: invoices, customer: customers, company: companies })
    .from(releaseOrders)
    .innerJoin(invoices, eq(invoices.id, releaseOrders.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(companies, eq(companies.id, releaseOrders.companyId))
    .where(eq(releaseOrders.id, releaseOrderId));
  if (!row) return;
  const { ro, invoice, customer, company } = row;
  const link = releaseOrderPdfUrl(ro.pdfToken);
  const base = { companyId: company.id, recipient: customer.phone, invoiceId: invoice.id, releaseOrderId: ro.id };

  if (channels.includes("whatsapp")) {
    const caption = `${company.name}\nPayment for ${invoice.invoiceNo} is complete. Release order ${ro.releaseNo} is attached: show it at the warehouse to collect your goods. / Malipo yamekamilika. Onyesha hati hii ghalani kuchukua mzigo wako.`;
    await logMessage({ ...base, channel: "whatsapp", body: caption }, await sendWhatsAppDocument(customer.phone, `${link}.pdf`, `${ro.releaseNo}.pdf`, caption));
  }
  if (channels.includes("sms")) {
    const text = `${company.name}: Malipo ya ${invoice.invoiceNo} yamekamilika. Hati ya kuchukua mzigo ${ro.releaseNo}: ${link}`;
    await logMessage({ ...base, channel: "sms", body: text }, await sendSms(customer.phone, text));
  }
}

/** Tells the customer what was received and what is still owed. */
export async function sendBalanceReminder(paymentId: string) {
  const [row] = await db
    .select({ payment: payments, invoice: invoices, customer: customers, company: companies, accountNo: collectionAccounts.bankAccountNo })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(companies, eq(companies.id, invoices.companyId))
    .leftJoin(collectionAccounts, eq(collectionAccounts.invoiceId, invoices.id))
    .where(eq(payments.id, paymentId));
  if (!row) return;
  const { payment, invoice, customer, company, accountNo } = row;
  const due = Number(invoice.totalTzs) - Number(invoice.amountPaid);
  const text = `${company.name}: Tumepokea TZS ${shillings(payment.amount)} kwa ${invoice.invoiceNo}. Baki TZS ${shillings(due)}. Lipa akaunti TCB ${accountNo ?? "-"}.`;
  await logMessage({ companyId: company.id, recipient: customer.phone, invoiceId: invoice.id, channel: "sms", body: text }, await sendSms(customer.phone, text));
}

/**
 * Marks the goods as handed over. Only once: a second call changes nothing and returns false.
 */
export async function markCollected(releaseOrderId: string, companyId: string, userId: string) {
  return db.transaction(async (tx) => {
    const [ro] = await tx
      .update(releaseOrders)
      .set({ collectedAt: new Date(), collectedBy: userId })
      .where(and(eq(releaseOrders.id, releaseOrderId), eq(releaseOrders.companyId, companyId), isNull(releaseOrders.collectedAt)))
      .returning();
    if (!ro) return false;
    const items = await tx.select({ cargoId: invoiceItems.cargoId }).from(invoiceItems).where(eq(invoiceItems.invoiceId, ro.invoiceId));
    if (items.length) {
      await tx.update(cargo).set({ status: "collected" }).where(inArray(cargo.id, items.map((i) => i.cargoId)));
    }
    return true;
  });
}

/** The messages a recorded payment calls for. Runs after the webhook has been answered. */
export async function notifyAfterPayment(outcome: { result: string; paymentId: string; releaseOrderId: string | null }) {
  if (outcome.releaseOrderId) await sendReleaseOrder(outcome.releaseOrderId);
  else if (outcome.result === "partly_paid") await sendBalanceReminder(outcome.paymentId);
}
