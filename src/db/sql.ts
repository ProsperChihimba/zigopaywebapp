import { getTableName, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * A column written as "table"."column". Drizzle leaves the table name off in single-table
 * selects, which makes an outer column inside a correlated subquery resolve to the inner table.
 */
export const qualified = (column: AnyPgColumn) => sql`${sql.identifier(getTableName(column.table))}.${sql.identifier(column.name)}`;
