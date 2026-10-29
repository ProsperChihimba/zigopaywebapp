"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, FormPage, FormSection, Input, Select, SubmitBar } from "@/components/form";
import { CARGO_STATUS } from "@/lib/labels";
import { createInvoiceAction } from "../actions";

type Cargo = { id: string; trackingNo: string; description: string; status: keyof typeof CARGO_STATUS; packages: number; volume: string };

const tzs = (n: number) => Math.round(n).toLocaleString("en-US");

export function InvoiceForm(props: {
  companyName: string;
  defaultRate: number;
  customers: { id: string; label: string }[];
  customer: { id: string; name: string; phone: string } | null;
  cargo: Cargo[];
}) {
  const { customers, customer, cargo, defaultRate, companyName } = props;
  const router = useRouter();
  const [state, action, pending] = useActionState(createInvoiceAction, undefined);
  const v = state?.values ?? {};
  const f = state?.fields ?? {};

  const [picked, setPicked] = useState<Record<string, boolean>>(() => Object.fromEntries(cargo.map((c) => [c.id, v[`price_${c.id}`] !== undefined || cargo.length === 1])));
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(cargo.map((c) => [c.id, v[`price_${c.id}`] ?? ""])));
  const [rate, setRate] = useState(v.usdRate ?? String(defaultRate));

  const lines = cargo.filter((c) => picked[c.id]);
  const usdTotal = lines.reduce((t, c) => t + (Number(prices[c.id]) || 0), 0);
  const tzsTotal = lines.reduce((t, c) => t + Math.round((Number(prices[c.id]) || 0) * (Number(rate) || 0)), 0);

  return (
    <FormPage back="/invoices" title="Create a new invoice">
      <div className="grid gap-10 xl:grid-cols-[1fr_380px]">
        <form action={action}>
          <FormSection title="Customer details">
            <div className="sm:col-span-2">
              <Field label="Select customer">
                <Select
                  value={customer?.id ?? ""}
                  onChange={(e) => router.push(e.target.value ? `/invoices/new?customer=${e.target.value}` : "/invoices/new")}
                  placeholder={customers.length ? "Choose a customer with cargo to invoice" : "No customer has cargo waiting for an invoice"}
                  options={customers.map((c) => ({ value: c.id, label: c.label }))}
                />
              </Field>
            </div>
            <Field label="Exchange rate (TZS per $1)" error={f.usdRate}>
              <Input name="usdRate" type="number" min={1} step="any" value={rate} onChange={(e) => setRate(e.target.value)} required />
            </Field>
          </FormSection>

          {customer && (
            <>
              <input type="hidden" name="customerId" value={customer.id} />
              <FormSection title="Select cargo to invoice">
                <div className="overflow-x-auto sm:col-span-2 xl:col-span-4">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-tint-grey text-xs text-muted">
                      <tr>
                        {["", "Tracking no.", "Description", "Status", "Pkg", "Volume", "Price ($)", "Price (TZS)"].map((h) => (
                          <th key={h} className="px-3 py-2 font-normal">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cargo.map((c) => (
                        <tr key={c.id} className="border-t border-line align-top">
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              name="cargoId"
                              value={c.id}
                              checked={!!picked[c.id]}
                              onChange={(e) => setPicked((p) => ({ ...p, [c.id]: e.target.checked }))}
                              aria-label={`Invoice ${c.trackingNo}`}
                              className="h-4 w-4 accent-[var(--color-brand)]"
                            />
                          </td>
                          <td className="px-3 py-3 font-medium">{c.trackingNo}</td>
                          <td className="px-3 py-3">{c.description}</td>
                          <td className="px-3 py-3">{CARGO_STATUS[c.status].label}</td>
                          <td className="px-3 py-3">{c.packages}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{c.volume}</td>
                          <td className="w-32 px-3 py-1.5">
                            <Input
                              name={`price_${c.id}`}
                              type="number"
                              min={0}
                              step="0.01"
                              disabled={!picked[c.id]}
                              value={prices[c.id]}
                              onChange={(e) => setPrices((p) => ({ ...p, [c.id]: e.target.value }))}
                              aria-label={`Price in USD for ${c.trackingNo}`}
                              className="mt-0"
                            />
                            {f[`price_${c.id}`] && <span className="mt-1 block text-xs text-red-600">{f[`price_${c.id}`]}</span>}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">{picked[c.id] ? tzs((Number(prices[c.id]) || 0) * (Number(rate) || 0)) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </FormSection>
            </>
          )}
          <SubmitBar label="Create invoice" pending={pending} error={state?.error} />
        </form>

        <aside className="h-fit rounded-2xl border border-line bg-tint-grey p-6 xl:sticky xl:top-10" aria-label="Invoice preview">
          <h2 className="text-base font-semibold">Invoice preview</h2>
          <p className="mt-1 text-xs text-muted">{companyName}</p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Client</dt>
              <dd className="text-right font-medium">{customer?.name ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Phone</dt>
              <dd className="text-right">{customer?.phone ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Cargo lines</dt>
              <dd>{lines.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Total ($)</dt>
              <dd>{usdTotal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-sm text-muted">Customer pays</p>
            <p className="mt-1 text-2xl font-semibold">TZS {tzs(tzsTotal)}</p>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-muted">
            When you create the invoice, Zigopay opens its TCB account through Daraja, then sends the PDF to the customer by WhatsApp and a link by SMS.
          </p>
        </aside>
      </div>
    </FormPage>
  );
}
