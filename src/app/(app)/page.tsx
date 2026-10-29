import { and, count, eq, inArray } from "drizzle-orm";
import { Package, Ship, Users, FileText } from "lucide-react";
import { requireUser } from "@/auth";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/page-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Dashboard · Zigopay" };

export default async function DashboardPage() {
  const { companyId } = await requireUser();
  const { cargo, shipments, customers, invoices } = schema;

  const [[inWarehouse], [onTheWay], [customerCount], [unpaid]] = await Promise.all([
    db.select({ n: count() }).from(cargo).where(and(eq(cargo.companyId, companyId), eq(cargo.status, "received"))),
    db
      .select({ n: count() })
      .from(shipments)
      .where(and(eq(shipments.companyId, companyId), inArray(shipments.status, ["loaded", "in_transit", "at_port"]))),
    db.select({ n: count() }).from(customers).where(eq(customers.companyId, companyId)),
    db
      .select({ n: count() })
      .from(invoices)
      .where(and(eq(invoices.companyId, companyId), inArray(invoices.status, ["unpaid", "partly_paid"]))),
  ]);

  return (
    <>
      <PageHeader title="Dashboard" />
      <StatGrid>
        <StatCard label="Cargo in warehouse" value={inWarehouse.n} icon={Package} tint="orange" />
        <StatCard label="Shipments on the way" value={onTheWay.n} icon={Ship} tint="green" />
        <StatCard label="Customers" value={customerCount.n} icon={Users} tint="blue" />
        <StatCard label="Invoices awaiting payment" value={unpaid.n} icon={FileText} tint="yellow" />
      </StatGrid>
      <ComingSoon what="Today's collections and recent payments" milestone={5} />
    </>
  );
}
