import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

const url = databaseUrl();

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };
const client = globalForDb.pgClient ?? postgres(url, { max: 5, prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
