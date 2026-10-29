import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { releaseOrders, invoices, invoiceItems, cargo, customers, companies } = schema;

export async function releaseOrderForPdf(token: string) {
  const [head] = await db
    .select({ ro: releaseOrders, invoice: invoices, customer: customers, company: companies })
    .from(releaseOrders)
    .innerJoin(invoices, eq(invoices.id, releaseOrders.invoiceId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(companies, eq(companies.id, releaseOrders.companyId))
    .where(eq(releaseOrders.pdfToken, token));
  if (!head) return null;
  const items = await db
    .select({ trackingNo: cargo.trackingNo, description: cargo.description, packages: invoiceItems.packages, volume: invoiceItems.volume, volumeUnit: invoiceItems.volumeUnit })
    .from(invoiceItems)
    .innerJoin(cargo, eq(cargo.id, invoiceItems.cargoId))
    .where(eq(invoiceItems.invoiceId, head.invoice.id))
    .orderBy(asc(cargo.receivedAt));
  return { ...head, items };
}

export type ReleaseOrderPdfData = NonNullable<Awaited<ReturnType<typeof releaseOrderForPdf>>>;
