import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { toCsv } from "@/lib/csv";

const { payments, invoices, customers, users } = schema;

/** "2026-10-29 05:42" in East Africa Time, which spreadsheets read as a date. */
const eat = (d: Date) => new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 16).replace("T", " ");

/** All of the company's payments as CSV, newest first, for finance to reconcile against Daraja. */
export async function GET() {
  const { companyId } = await requireUser();
  const rows = await db
    .select({ p: payments, invoiceNo: invoices.invoiceNo, customerName: customers.name, recordedBy: users.name })
    .from(payments)
    .leftJoin(invoices, eq(invoices.id, payments.invoiceId))
    .leftJoin(customers, eq(customers.id, invoices.customerId))
    .leftJoin(users, eq(users.id, payments.recordedBy))
    .where(eq(payments.companyId, companyId))
    .orderBy(desc(payments.receivedAt));

  const csv = toCsv([
    ["Received (EAT)", "Amount (TZS)", "To wallet (TZS)", "Invoice", "Customer", "Payer", "Payer account", "Payer bank", "Source", "Daraja collection ID", "Recorded by", "Note"],
    ...rows.map(({ p, invoiceNo, customerName, recordedBy }) => [
      eat(p.receivedAt),
      p.amount,
      p.toWallet,
      invoiceNo ?? "UNMATCHED",
      customerName,
      p.payerName,
      p.payerAccountNo,
      p.payerBank,
      p.source,
      p.collectionId,
      recordedBy,
      p.note,
    ]),
  ]);
  const today = eat(new Date()).slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zigopay-payments-${today}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
