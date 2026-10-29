import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { uninvoicedCargo } from "@/lib/invoices";
import { displayPhone } from "@/lib/phone";
import { InvoiceForm } from "./invoice-form";

export const metadata = { title: "Create invoice · Zigopay" };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { companyId } = await requireUser();
  const { customer: customerParam } = await searchParams;
  const { customers, cargo, invoiceItems, companies } = schema;

  // Only customers with cargo that is not invoiced yet.
  const [choices, company] = await Promise.all([
    db
      .select({ id: customers.id, name: customers.name, phone: customers.phone, open: sql<number>`count(${cargo.id})`.mapWith(Number) })
      .from(customers)
      .innerJoin(cargo, eq(cargo.customerId, customers.id))
      .leftJoin(invoiceItems, eq(invoiceItems.cargoId, cargo.id))
      .where(and(eq(customers.companyId, companyId), isNull(invoiceItems.id)))
      .groupBy(customers.id)
      .orderBy(asc(customers.name)),
    db.query.companies.findFirst({ where: eq(companies.id, companyId) }),
  ]);

  const selected = choices.find((c) => c.id === customerParam);
  const rows = selected ? await uninvoicedCargo(companyId, selected.id) : [];

  return (
    <InvoiceForm
      key={selected?.id ?? "none"}
      companyName={company?.name ?? ""}
      defaultRate={Number(company?.usdRate ?? 2700)}
      customers={choices.map((c) => ({ id: c.id, label: `${c.name} · ${displayPhone(c.phone)} · ${c.open} cargo` }))}
      customer={selected ? { id: selected.id, name: selected.name, phone: displayPhone(selected.phone) } : null}
      cargo={rows.map(({ cargo: c }) => ({
        id: c.id,
        trackingNo: c.trackingNo,
        description: c.description ?? "-",
        status: c.status,
        packages: c.packages,
        volume: `${Number(c.volume)} ${c.volumeUnit}`,
      }))}
    />
  );
}
