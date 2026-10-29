import "./env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { databaseUrl } from "../src/db/url";

async function main() {
  const client = postgres(databaseUrl(), { max: 1 });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();
  console.log("Migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
