"use client";

import { useActionState, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Field, FormPage, FormSection, Input, Select, SubmitBar } from "@/components/form";
import { createShipment } from "../actions";

export type WarehouseCargo = { id: string; trackingNo: string; customerName: string; packages: number; volume: number; unit: "cbm" | "kg"; valueUsd: number };

const sum = (rows: WarehouseCargo[], unit: "cbm" | "kg") => rows.filter((r) => r.unit === unit).reduce((t, r) => t + r.volume, 0);

export function ShipmentForm({ available, suggestedNo }: { available: WarehouseCargo[]; suggestedNo: string }) {
  const [state, action, pending] = useActionState(createShipment, undefined);
  const v = state?.values ?? {};
  const f = state?.fields ?? {};
  const [picked, setPicked] = useState<WarehouseCargo[]>([]);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return available
      .filter((c) => !picked.some((p) => p.id === c.id))
      .filter((c) => !q || c.trackingNo.toLowerCase().includes(q) || c.customerName.toLowerCase().includes(q))
      .slice(0, 6);
  }, [available, picked, query]);

  const cbm = sum(picked, "cbm");
  const kg = sum(picked, "kg");
  const totalVolume = [cbm && `${+cbm.toFixed(3)} cbm`, kg && `${+kg.toFixed(2)} kg`].filter(Boolean).join(" + ") || "0";
  const totalValue = picked.reduce((t, r) => t + r.valueUsd, 0);

  return (
    <FormPage back="/shipments" title="Register a New Shipment">
      {/* Remount after a rejected submit: React resets forms after an action, and selects would snap back to their first value. */}
      <form action={action} key={JSON.stringify(state?.values ?? {})}>
        <FormSection title="Shipment details">
          <Field label="Shipment number" error={f.shipmentNo}>
            <Input name="shipmentNo" defaultValue={v.shipmentNo ?? suggestedNo} required />
          </Field>
          <Field label="Shipment name">
            <Input name="name" defaultValue={v.name} placeholder="e.g. Guangzhou sea, November" />
          </Field>
          <Field label="Shipment type" error={f.type}>
            <Select name="type" defaultValue={v.type} placeholder="Select sea or air" options={[{ value: "sea", label: "Sea" }, { value: "air", label: "Air" }]} required />
          </Field>
          <span />
          <Field label="ETD" error={f.etd}>
            <Input name="etd" type="date" defaultValue={v.etd} />
          </Field>
          <Field label="ETA" error={f.eta}>
            <Input name="eta" type="date" defaultValue={v.eta} />
          </Field>
          <Field label="Total cargo">
            <Input value={picked.length} disabled readOnly />
          </Field>
          <Field label="Total volume">
            <Input value={totalVolume} disabled readOnly />
          </Field>
        </FormSection>

        <FormSection title="Add cargo to shipment">
          <div className="sm:col-span-2 xl:col-span-4">
            <label className="relative block max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cargo in the warehouse by tracking number or customer"
                aria-label="Search cargo in the warehouse"
                className="w-full rounded-lg border border-line py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
              />
            </label>
            <ul className="mt-2 max-w-md divide-y divide-line rounded-lg border border-line text-sm">
              {matches.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span>
                    <span className="font-medium">{c.trackingNo}</span> <span className="text-muted">· {c.customerName} · {c.packages} pkg</span>
                  </span>
                  <button type="button" onClick={() => setPicked((p) => [...p, c])} className="text-sm font-medium text-brand hover:underline">
                    Add
                  </button>
                </li>
              ))}
              {matches.length === 0 && <li className="px-3 py-2 text-muted">{available.length ? "No cargo matches." : "No cargo is waiting in the warehouse."}</li>}
            </ul>

            <h3 className="mt-8 text-sm font-medium">Packing list ({picked.length})</h3>
            <div className="mt-2 overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-tint-grey text-xs text-muted">
                  <tr>
                    {["Tracking number", "Customer", "Packages", "Volume", "Value ($)", ""].map((h) => (
                      <th key={h} className="px-3 py-2 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {picked.map((c) => (
                    <tr key={c.id} className="border-t border-line">
                      <td className="px-3 py-2 font-medium">
                        <input type="hidden" name="cargoId" value={c.id} />
                        {c.trackingNo}
                      </td>
                      <td className="px-3 py-2">{c.customerName}</td>
                      <td className="px-3 py-2">{c.packages}</td>
                      <td className="px-3 py-2">
                        {c.volume} {c.unit}
                      </td>
                      <td className="px-3 py-2">{c.valueUsd.toLocaleString("en-US")}</td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => setPicked((p) => p.filter((x) => x.id !== c.id))} aria-label={`Remove ${c.trackingNo}`} className="text-muted hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {picked.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted">
                        Add cargo from the search above. You can also save the shipment empty and add cargo later from New Cargo.
                      </td>
                    </tr>
                  )}
                </tbody>
                {picked.length > 0 && (
                  <tfoot className="border-t border-line font-medium">
                    <tr>
                      <td className="px-3 py-2" colSpan={2}>
                        Total
                      </td>
                      <td className="px-3 py-2">{picked.reduce((t, r) => t + r.packages, 0)}</td>
                      <td className="px-3 py-2">{totalVolume}</td>
                      <td className="px-3 py-2">{totalValue.toLocaleString("en-US")}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </FormSection>

        <SubmitBar label="Record New Shipment" pending={pending} error={state?.error} />
      </form>
    </FormPage>
  );
}
