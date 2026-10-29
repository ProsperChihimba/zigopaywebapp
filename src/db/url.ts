/**
 * DATABASE_URL, ready for the postgres driver. Neon's connection strings include
 * `channel_binding=require`, which the driver would send to the server as a setting
 * Postgres rejects ("unrecognized configuration parameter"). TLS stays on via sslmode.
 */
export function databaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  const url = new URL(raw);
  url.searchParams.delete("channel_binding");
  return url.toString();
}
