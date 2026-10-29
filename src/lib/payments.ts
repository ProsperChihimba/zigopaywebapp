import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { newLinkToken } from "@/lib/ids";
import { nextNumber } from "@/lib/numbering";

const { payments, invoices, customers, companies, collectionAccounts, releaseOrders } = schema;

/** "5000.00" → 500000. Amounts are handled in cents so no float rounding creeps in. */
export function toCents(amount: string | number): number | null {
  const text = typeof amount === "number" ? amount.toFixed(2) : amount.trim();
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}
const fromCents = (cents: number) => (cents / 100).toFixed(2);

export type IncomingPayment = {
  amount: string;
  receivedAt: Date;
  source: "webhook" | "manual";
  /** Daraja's collection_id. Unique: the same payment is never counted twice. */
  collectionId?: string | null;
  reference?: string | null;
  bankAccountNo?: string | null;
  partnerId?: string | null;
  payerName?: string | null;
  payerAccountNo?: string | null;
  payerBank?: string | null;
  note?: string | null;
  recordedBy?: string | null;
  raw?: unknown;
  /** Manual payments name their invoice and company directly. */
  invoiceId?: string;
  companyId?: string;
};

export type PaymentOutcome =
  | { kind: "duplicate" }
  | { kind: "invalid"; error: string }
  | {
      kind: "recorded";
      paymentId: string;
      invoiceId: string | null;
      /** paid: the invoice is now fully paid · partly_paid: some is still owed · wallet: the invoice was already paid · unmatched: no invoice found */
      result: "paid" | "partly_paid" | "wallet" | "unmatched";
      releaseOrderId: string | null;
    };

/** Which invoice a Daraja payment belongs to: the account it was paid into, cross-checked with the reference. */
async function matchInvoice(tx: Tx, p: IncomingPayment) {
  if (p.invoiceId) return p.invoiceId;
  if (p.bankAccountNo) {
    const rows = await tx
      .select({ invoiceId: invoices.id, invoiceNo: invoices.invoiceNo })
      .from(collectionAccounts)
      .innerJoin(invoices, eq(invoices.id, collectionAccounts.invoiceId))
      .where(eq(collectionAccounts.bankAccountNo, p.bankAccountNo));
    const exact = rows.find((r) => r.invoiceNo === p.reference) ?? (rows.length === 1 ? rows[0] : undefined);
    if (exact) return exact.invoiceId;
  }
  return null;
}

/** The company an unmatched payment is filed under: the one linked to the Daraja partner, or the only company. */
async function fallbackCompany(tx: Tx, partnerId?: string | null) {
  if (partnerId) {
    const linked = await tx.query.companies.findFirst({ where: eq(companies.darajaPartnerId, partnerId) });
    if (linked) return linked.id;
  }
  const all = await tx.select({ id: companies.id }).from(companies).limit(2);
  return all.length === 1 ? all[0].id : null;
}

type Tx = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

/**
 * Records a payment and applies it: to the invoice's balance first, anything above that to the
 * customer's wallet. When the invoice becomes fully paid, its release order is issued in the same
 * transaction, so a paid invoice can never be left without one.
 */
export async function applyPayment(p: IncomingPayment): Promise<PaymentOutcome> {
  const cents = toCents(p.amount);
  if (cents === null || cents <= 0) return { kind: "invalid", error: `Amount "${p.amount}" is not a positive amount` };

  return db.transaction(async (tx) => {
    const invoiceId = await matchInvoice(tx, p);
    const invoice = invoiceId
      ? (await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update"))[0]
      : undefined;
    if (p.companyId && invoice && invoice.companyId !== p.companyId) return { kind: "invalid", error: "That invoice belongs to another company" } as const;

    const companyId = invoice?.companyId ?? p.companyId ?? (await fallbackCompany(tx, p.partnerId));
    if (!companyId) return { kind: "invalid", error: "No company matches this payment" } as const;

    const owed = invoice ? Math.max(0, toCents(invoice.totalTzs)! - toCents(invoice.amountPaid)!) : 0;
    const applied = Math.min(cents, owed);
    const toWallet = invoice ? cents - applied : 0;

    const [payment] = await tx
      .insert(payments)
      .values({
        companyId,
        invoiceId: invoice?.id ?? null,
        collectionId: p.collectionId ?? null,
        reference: p.reference ?? null,
        amount: fromCents(cents),
        toWallet: fromCents(toWallet),
        payerName: p.payerName || null,
        payerAccountNo: p.payerAccountNo || null,
        payerBank: p.payerBank || null,
        receivedAt: p.receivedAt,
        source: p.source,
        note: p.note ?? null,
        recordedBy: p.recordedBy ?? null,
        raw: p.raw ?? null,
      })
      .onConflictDoNothing({ target: payments.collectionId })
      .returning({ id: payments.id });
    if (!payment) return { kind: "duplicate" } as const;

    if (!invoice) return { kind: "recorded", paymentId: payment.id, invoiceId: null, result: "unmatched", releaseOrderId: null } as const;

    const paidNow = toCents(invoice.amountPaid)! + applied;
    const fullyPaid = paidNow >= toCents(invoice.totalTzs)!;
    await tx
      .update(invoices)
      .set({ amountPaid: fromCents(paidNow), status: fullyPaid ? "paid" : paidNow > 0 ? "partly_paid" : "unpaid" })
      .where(eq(invoices.id, invoice.id));
    if (toWallet > 0) {
      await tx
        .update(customers)
        .set({ walletBalance: sql`${customers.walletBalance} + ${fromCents(toWallet)}` })
        .where(eq(customers.id, invoice.customerId));
    }

    let releaseOrderId: string | null = null;
    if (fullyPaid && invoice.status !== "paid") {
      const releaseNo = await nextNumber(tx, "RO", releaseOrders, releaseOrders.companyId, releaseOrders.issuedAt, companyId);
      const [ro] = await tx
        .insert(releaseOrders)
        .values({ companyId, invoiceId: invoice.id, releaseNo, pdfToken: newLinkToken() })
        .onConflictDoNothing({ target: releaseOrders.invoiceId })
        .returning({ id: releaseOrders.id });
      releaseOrderId = ro?.id ?? null;
    }

    const result = invoice.status === "paid" ? "wallet" : fullyPaid ? "paid" : "partly_paid";
    return { kind: "recorded", paymentId: payment.id, invoiceId: invoice.id, result, releaseOrderId } as const;
  });
}

/** The release order of an invoice, if it has one. */
export const releaseOrderFor = (invoiceId: string) => db.query.releaseOrders.findFirst({ where: and(eq(releaseOrders.invoiceId, invoiceId)) });
