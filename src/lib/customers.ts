import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

type Db = typeof db;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Finds a customer by phone in this company, or creates them. `phone` must already be normalized. */
export async function findOrCreateCustomer(tx: Db | Tx, companyId: string, phone: string, name: string, destinationCountry = "Tanzania") {
  const existing = await tx.query.customers.findFirst({
    where: and(eq(schema.customers.companyId, companyId), eq(schema.customers.phone, phone)),
  });
  if (existing) return existing;
  const [created] = await tx.insert(schema.customers).values({ companyId, name, phone, destinationCountry }).returning();
  return created;
}
