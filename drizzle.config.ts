import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/db/url";

config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl() },
});
