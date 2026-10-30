import "./env";

// Runs first in vercel-build: stop a deploy that nobody could use, and say why.
const required: Record<string, string> = {
  DATABASE_URL: "the Postgres connection (add Neon from Vercel Storage)",
  AUTH_SECRET: "staff sign-in (generate with: openssl rand -base64 32)",
};
const optional: Record<string, string> = {
  DARAJA_TOKEN: "opening TCB accounts for invoices",
  DARAJA_WEBHOOK_SECRET: "accepting payment webhooks",
  MIFUMO_SMS_API_KEY: "sending SMS",
  MIFUMO_SMS_SENDER_ID: "sending SMS",
};

const env = process.env.VERCEL_ENV ?? "local";
const missing = Object.keys(required).filter((k) => !process.env[k]);
for (const k of Object.keys(optional).filter((k) => !process.env[k])) {
  console.warn(`Warning: ${k} is not set for "${env}". Without it, Zigopay can't do ${optional[k]}.`);
}
if (missing.length) {
  for (const k of missing) console.error(`Missing ${k} for "${env}": needed for ${required[k]}.`);
  console.error("Add it in Vercel → Settings → Environment Variables (tick this environment), then redeploy.");
  process.exit(1);
}
console.log(`Environment OK for "${env}"`);
