/** The outcome of a call to an outside service, kept as-is in the database for support. */
export type CallResult<T = unknown> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status?: number; data?: unknown; notConfigured?: boolean };

export async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
