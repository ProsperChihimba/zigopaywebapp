import "server-only";
import { readBody, type CallResult } from "./result";

export type CollectionAccount = {
  virtual_account_id: string;
  bank_account_no: string;
  account_name: string;
  reference: string;
  loan_reference: string;
  provider: string;
  currency: string;
};

const baseUrl = () => (process.env.DARAJA_BASE_URL ?? "https://backendapi.getdaraja.com").replace(/\/$/, "");

/**
 * Opens the TCB account a customer pays an invoice into. Daraja keys it on the reference,
 * so asking again for the same invoice returns the same account (200 instead of 201).
 *
 * A 502 or a timeout leaves it unknown whether the bank opened the account. Daraja says not
 * to retry those automatically: `uncertain` tells the caller to send it to Daraja ops instead.
 */
export async function openCollectionAccount(reference: string): Promise<CallResult<CollectionAccount> & { uncertain?: boolean }> {
  const token = process.env.DARAJA_TOKEN;
  if (!token) return { ok: false, notConfigured: true, error: "Daraja is not configured: DARAJA_TOKEN is not set" };

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/partners/collection-accounts/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ loan_reference: reference }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return { ok: false, uncertain: timedOut, error: timedOut ? "Daraja did not answer within 30 seconds" : `Could not reach Daraja: ${String(err)}` };
  }

  const data = await readBody(res);
  if (res.status === 200 || res.status === 201) return { ok: true, status: res.status, data: data as CollectionAccount };

  const detail = typeof data === "string" ? data : JSON.stringify(data);
  const reasons: Record<number, string> = {
    400: "Daraja refused the request",
    401: "Daraja rejected the token (DARAJA_TOKEN is wrong or was revoked)",
    403: "The Daraja account is pending approval",
    404: "This partner is not enabled for collections",
    409: "The Daraja account limit is reached",
    502: "The bank could not confirm the account",
  };
  return {
    ok: false,
    status: res.status,
    data,
    uncertain: res.status === 502,
    error: `${reasons[res.status] ?? `Daraja answered ${res.status}`}: ${detail.slice(0, 300)}`,
  };
}
