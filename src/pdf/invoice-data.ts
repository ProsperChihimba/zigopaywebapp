import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { invoices, invoiceItems, cargo, customers, companies, collectionAccounts } = schema;

/** Everything the invoice PDF shows, looked up by its public link token. */
export async function invoiceForPdf(token: string) {
  const [head] = await db
    .select({ invoice: invoices, customer: customers, company: companies, account: collectionAccounts })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(companies, eq(companies.id, invoices.companyId))
    .leftJoin(collectionAccounts, eq(collectionAccounts.invoiceId, invoices.id))
    .where(eq(invoices.pdfToken, token));
  if (!head) return null;

  const items = await db
    .select({ item: invoiceItems, trackingNo: cargo.trackingNo, description: cargo.description })
    .from(invoiceItems)
    .innerJoin(cargo, eq(cargo.id, invoiceItems.cargoId))
    .where(eq(invoiceItems.invoiceId, head.invoice.id))
    .orderBy(asc(cargo.receivedAt));

  return { ...head, items };
}

export type InvoicePdfData = NonNullable<Awaited<ReturnType<typeof invoiceForPdf>>>;
