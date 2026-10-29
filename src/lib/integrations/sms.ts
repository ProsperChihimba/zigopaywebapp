import "server-only";
import { readBody, type CallResult } from "./result";

/** Sends one SMS through Mifumo. `to` must be in +255… form. */
export async function sendSms(to: string, message: string): Promise<CallResult> {
  const key = process.env.MIFUMO_SMS_API_KEY;
  const sender = process.env.MIFUMO_SMS_SENDER_ID;
  if (!key || !sender) return { ok: false, notConfigured: true, error: "SMS is not configured: set MIFUMO_SMS_API_KEY and MIFUMO_SMS_SENDER_ID" };

  const base = (process.env.MIFUMO_SMS_BASE_URL ?? "https://mifumosms.mifumolabs.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/integration/v1/sms/send/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipients: [to], message, sender_id: sender }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const data = await readBody(res);
    if (res.ok) return { ok: true, status: res.status, data };
    return { ok: false, status: res.status, data, error: `Mifumo answered ${res.status}: ${JSON.stringify(data).slice(0, 300)}` };
  } catch (err) {
    return { ok: false, error: `Could not reach Mifumo: ${String(err)}` };
  }
}
