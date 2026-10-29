import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { db } from "@/db";

type Tx = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

/**
 * The next document number for a company this year, e.g. INV-2026-00001 or RO-2026-00001.
 * Call inside the transaction that inserts the document: the advisory lock makes concurrent
 * callers wait their turn, and the unique index on the number is the final guard.
 */
export async function nextNumber(tx: Tx, prefix: string, table: PgTable, companyColumn: PgColumn, dateColumn: PgColumn, companyId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${prefix}:${companyId}`}))`);
  const year = new Date().toLocaleString("en-US", { timeZone: "Africa/Dar_es_Salaam", year: "numeric" });
  const [{ n }] = await tx
    .select({ n: count() })
    .from(table)
    .where(and(eq(companyColumn, companyId), sql`extract(year from ${dateColumn} at time zone 'Africa/Dar_es_Salaam') = ${Number(year)}`));
  return `${prefix}-${year}-${String(n + 1).padStart(5, "0")}`;
}
