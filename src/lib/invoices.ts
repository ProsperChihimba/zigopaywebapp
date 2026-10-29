import "server-only";
import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { newLinkToken } from "@/lib/ids";
import { invoicePdfUrl } from "@/lib/urls";
import { openCollectionAccount } from "@/lib/integrations/daraja";
import { sendSms } from "@/lib/integrations/sms";
import { sendWhatsAppDocument } from "@/lib/integrations/whatsapp";
import type { CallResult } from "@/lib/integrations/result";

const { invoices, invoiceItems, cargo, customers, companies, collectionAccounts, messages } = schema;

export type InvoiceLine = { cargoId: string; priceUsd: number };

/** Whole shillings: invoices are paid by bank transfer in TZS. */
export const toTzs = (usd: number, rate: number) => Math.round(usd * rate);

/**
 * Creates an invoice for some of a customer's cargo. Each cargo can be on one invoice only.
 * Returns the new invoice's id, or an error a person can act on.
 */
export async function createInvoice(input: { companyId: string; customerId: string; usdRate: number; lines: InvoiceLine[]; createdBy: string }) {
  const { companyId, customerId, usdRate, lines, createdBy } = input;
  const ids = lines.map((l) => l.cargoId);

  return db.transaction(async (tx) => {
    // Lock the chosen cargo so two people can't invoice it at the same time.
    const rows = await tx
      .select({ id: cargo.id, packages: cargo.packages, volume: cargo.volume, volumeUnit: cargo.volumeUnit, invoiced: invoiceItems.id })
      .from(cargo)
      .leftJoin(invoiceItems, eq(invoiceItems.cargoId, cargo.id))
      .where(and(eq(cargo.companyId, companyId), eq(cargo.customerId, customerId), inArray(cargo.id, ids)))
      .for("update", { of: cargo });
    if (rows.length !== ids.length) return { error: "Some of the chosen cargo doesn't belong to this customer." } as const;
    if (rows.some((r) => r.invoiced)) return { error: "Some of the chosen cargo is already on another invoice." } as const;

    const priced = lines.map((l) => ({ ...l, priceTzs: toTzs(l.priceUsd, usdRate), cargo: rows.find((r) => r.id === l.cargoId)! }));
    const totalTzs = priced.reduce((t, l) => t + l.priceTzs, 0);

    // Numbers run per company and per year: INV-2026-00001. The unique index settles any race.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`invoice-no:${companyId}`}))`);
    const year = new Date().getFullYear();
    const [{ n }] = await tx
      .select({ n: count() })
      .from(invoices)
      .where(and(eq(invoices.companyId, companyId), sql`extract(year from ${invoices.issuedAt} at time zone 'Africa/Dar_es_Salaam') = ${year}`));
    const invoiceNo = `INV-${year}-${String(n + 1).padStart(5, "0")}`;

    const [invoice] = await tx
      .insert(invoices)
      .values({
        companyId,
        customerId,
        invoiceNo,
        issuedAt: new Date(),
        usdRate: String(usdRate),
        totalTzs: String(totalTzs),
        pdfToken: newLinkToken(),
        createdBy,
      })
      .returning({ id: invoices.id });

    await tx.insert(invoiceItems).values(
      priced.map((l) => ({
        invoiceId: invoice.id,
        cargoId: l.cargoId,
        packages: l.cargo.packages,
        volume: l.cargo.volume,
        volumeUnit: l.cargo.volumeUnit,
        priceUsd: l.priceUsd.toFixed(2),
        priceTzs: String(l.priceTzs),
      })),
    );
    await tx.insert(collectionAccounts).values({ invoiceId: invoice.id, status: "pending" });
    return { id: invoice.id } as const;
  });
}

/**
 * Opens the invoice's Daraja account if it doesn't have one yet.
 * Only a "pending" or "failed" account is tried; "uncertain" waits for Daraja ops.
 */
export async function ensureCollectionAccount(invoiceId: string) {
  const account = await db.query.collectionAccounts.findFirst({ where: eq(collectionAccounts.invoiceId, invoiceId) });
  if (!account || account.status === "created" || account.status === "uncertain") return account;

  const invoice = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!invoice) return account;

  const result = await openCollectionAccount(invoice.invoiceNo);
  const [updated] = await db
    .update(collectionAccounts)
    .set(
      result.ok
        ? { status: "created", bankAccountNo: result.data.bank_account_no, accountName: result.data.account_name, virtualAccountId: result.data.virtual_account_id, error: null }
        : { status: result.uncertain ? "uncertain" : "failed", error: result.error },
    )
    .where(eq(collectionAccounts.id, account.id))
    .returning();
  return updated;
}

const amount = (n: string | number) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

/** The SMS text, kept to one 160-character message where the link allows. */
export function invoiceSms(company: string, invoiceNo: string, totalTzs: string, accountNo: string, link: string) {
  return `${company}: Ankara ${invoiceNo} TZS ${amount(totalTzs)}. Lipa akaunti TCB ${accountNo}. Pakua: ${link}`;
}

async function logMessage(values: Omit<typeof messages.$inferInsert, "status">, result: CallResult) {
  await db.insert(messages).values({
    ...values,
    status: result.ok ? "sent" : "failed",
    providerResponse: result.ok ? { status: result.status, data: result.data } : { error: result.error, status: result.status, notConfigured: result.notConfigured ?? false },
  });
}

/** Sends the invoice by WhatsApp (PDF) and SMS (link). Needs the bank account to exist. */
export async function sendInvoice(invoiceId: string, channels: ("whatsapp" | "sms")[] = ["whatsapp", "sms"]) {
  const [row] = await db
    .select({ invoice: invoices, customer: customers, company: companies, account: collectionAccounts })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(companies, eq(companies.id, invoices.companyId))
    .innerJoin(collectionAccounts, eq(collectionAccounts.invoiceId, invoices.id))
    .where(eq(invoices.id, invoiceId));
  if (!row || row.account.status !== "created" || !row.account.bankAccountNo) return;

  const { invoice, customer, company, account } = row;
  const accountNo = row.account.bankAccountNo;
  const link = invoicePdfUrl(invoice.pdfToken);
  const base = { companyId: company.id, recipient: customer.phone, invoiceId };

  if (channels.includes("whatsapp")) {
    const caption = `${company.name}\nInvoice ${invoice.invoiceNo}: TZS ${amount(invoice.totalTzs)}.\nPay to TCB account ${account.bankAccountNo} (${account.accountName ?? company.name}). / Lipa kwenye akaunti ya TCB ${account.bankAccountNo}.`;
    await logMessage({ ...base, channel: "whatsapp", body: caption }, await sendWhatsAppDocument(customer.phone, `${link}.pdf`, `${invoice.invoiceNo}.pdf`, caption));
  }
  if (channels.includes("sms")) {
    const text = invoiceSms(company.name, invoice.invoiceNo, invoice.totalTzs, accountNo, link);
    await logMessage({ ...base, channel: "sms", body: text }, await sendSms(customer.phone, text));
  }
}

/** Everything after an invoice is saved: open the account, then send it. Runs after the response. */
export async function processNewInvoice(invoiceId: string) {
  const account = await ensureCollectionAccount(invoiceId);
  if (account?.status === "created") await sendInvoice(invoiceId);
}

/** Cargo of a customer that is not on any invoice yet, oldest first. */
export function uninvoicedCargo(companyId: string, customerId: string) {
  return db
    .select({ cargo })
    .from(cargo)
    .leftJoin(invoiceItems, eq(invoiceItems.cargoId, cargo.id))
    .where(and(eq(cargo.companyId, companyId), eq(cargo.customerId, customerId), isNull(invoiceItems.id)))
    .orderBy(asc(cargo.receivedAt));
}
