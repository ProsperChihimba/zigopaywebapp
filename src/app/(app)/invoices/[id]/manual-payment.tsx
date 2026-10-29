"use client";

import { useActionState, useState } from "react";
import { Field, Input, Textarea } from "@/components/form";
import { recordManualPaymentAction } from "../../payments/actions";

/** For a payment Daraja confirmed but whose webhook never reached Zigopay. */
export function ManualPayment({ invoiceId, balance, now }: { invoiceId: string; balance: number; now: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(recordManualPaymentAction, undefined);
  const v = state?.values ?? {};
  const f = state?.fields ?? {};

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-tint-grey">
          Record payment manually
        </button>
        {state?.notice && <span className="text-sm text-brand">{state.notice}</span>}
      </div>
    );
  }

  return (
    <form action={action} key={JSON.stringify(v)} className="rounded-2xl border border-line p-5">
      <h3 className="text-sm font-semibold">Record a payment manually</h3>
      <p className="mt-1 text-xs text-muted">Only for a payment Daraja ops confirmed but whose webhook never arrived. It is marked as manual, with your name.</p>
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Amount (TZS)" error={f.amount}>
          <Input name="amount" inputMode="decimal" defaultValue={v.amount ?? (balance > 0 ? String(balance) : "")} required />
        </Field>
        <Field label="Received" error={f.receivedAt}>
          <Input name="receivedAt" type="datetime-local" defaultValue={v.receivedAt ?? now} required />
        </Field>
        <Field label="Payer name">
          <Input name="payerName" defaultValue={v.payerName} placeholder="As on the bank record" />
        </Field>
        <div className="sm:col-span-3">
          <Field label="Note: how it was confirmed" error={f.note}>
            <Textarea name="note" rows={2} defaultValue={v.note} placeholder="e.g. Confirmed by Daraja ops, collection Q13F6RXTRAS3" required />
          </Field>
        </div>
      </div>
      {state?.error && <p className="mt-3 text-sm text-red-600" role="alert">{state.error}</p>}
      <div className="mt-4 flex gap-3">
        <button disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">
          {pending ? "Saving…" : "Save payment"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}
