import "server-only";
import { db, schema } from "@/db";
import type { CallResult } from "@/lib/integrations/result";

/** Records a WhatsApp or SMS attempt and its outcome, so staff can see it and resend. */
export async function logMessage(values: Omit<typeof schema.messages.$inferInsert, "status">, result: CallResult) {
  await db.insert(schema.messages).values({
    ...values,
    status: result.ok ? "sent" : "failed",
    providerResponse: result.ok ? { status: result.status, data: result.data } : { error: result.error, status: result.status, notConfigured: result.notConfigured ?? false },
  });
}

export const shillings = (n: string | number) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
