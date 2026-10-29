import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { applyPayment } from "@/lib/payments";
import { notifyAfterPayment } from "@/lib/release-orders";

export const dynamic = "force-dynamic";

const event = z.object({
  event: z.string(),
  collection_id: z.string().min(1),
  reference: z.string().nullish(),
  amount: z.string(),
  bank_account_no: z.string().nullish(),
  currency: z.string().nullish(),
  partner_id: z.string().nullish(),
  payer_name: z.string().nullish(),
  payer_account_no: z.string().nullish(),
  payer_bank: z.string().nullish(),
  received_at: z.string().nullish(),
});

/** Daraja signs the exact body bytes: hex HMAC-SHA256 with the webhook secret. */
function signatureMatches(raw: Buffer, sent: string, secret: string) {
  const mine = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const theirs = Buffer.from(sent.trim().toLowerCase());
  return mine.length === theirs.length && timingSafeEqual(mine, theirs);
}

/** Daraja's timestamps carry no offset and are East Africa Time (UTC+3). */
const eatTime = (s: string | null | undefined) => {
  const d = s ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}+03:00`) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

/**
 * collection.booked: a payment into one of our invoice accounts, confirmed and credited.
 * Daraja tries 3 times and needs a 2xx within 10 seconds, so only the database work happens
 * before answering; messages go out afterwards.
 */
export async function POST(req: Request) {
  const secret = process.env.DARAJA_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook secret not configured", { status: 503 });

  const raw = Buffer.from(await req.arrayBuffer());
  if (!signatureMatches(raw, req.headers.get("x-daraja-signature") ?? "", secret)) {
    return new Response("Bad signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    return new Response("Body is not JSON", { status: 400 });
  }
  const parsed = event.safeParse(body);
  if (!parsed.success) return new Response("Unexpected payload", { status: 400 });
  const e = parsed.data;
  if (e.event !== "collection.booked") return new Response(null, { status: 204 });
  if (e.currency && e.currency !== "TZS") return new Response("Only TZS is supported", { status: 400 });

  const outcome = await applyPayment({
    source: "webhook",
    amount: e.amount,
    collectionId: e.collection_id,
    reference: e.reference,
    bankAccountNo: e.bank_account_no,
    partnerId: e.partner_id,
    payerName: e.payer_name,
    payerAccountNo: e.payer_account_no,
    payerBank: e.payer_bank,
    receivedAt: eatTime(e.received_at),
    raw: body,
  });

  if (outcome.kind === "invalid") return Response.json({ ok: false, error: outcome.error }, { status: 400 });
  if (outcome.kind === "recorded") after(() => notifyAfterPayment(outcome));
  return Response.json({ ok: true, duplicate: outcome.kind === "duplicate" });
}
