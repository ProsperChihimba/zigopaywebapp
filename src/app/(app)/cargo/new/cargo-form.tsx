"use client";

import { useActionState, useState } from "react";
import { Field, FormPage, FormSection, Input, Select, SubmitBar, Textarea } from "@/components/form";
import { CARGO_TYPES, COUNTRIES } from "@/lib/labels";
import { createCargo } from "../actions";

type Customer = { name: string; phone: string; localPhone: string };
type Shipment = { id: string; label: string };

export function CargoForm({ customers, shipments, now }: { customers: Customer[]; shipments: Shipment[]; now: string }) {
  const [state, action, pending] = useActionState(createCargo, undefined);
  const v = state?.values ?? {};
  const f = state?.fields ?? {};
  const [phone, setPhone] = useState(v.customerPhone ?? "");
  const digits = phone.replace(/\D/g, "").replace(/^(255|0)/, "");
  const match = digits.length >= 9 ? customers.find((c) => c.phone.endsWith(digits)) : undefined;

  return (
    <FormPage back="/cargo" title="Register a New Cargo">
      {/* Remount after a rejected submit: React resets forms after an action, and selects would snap back to their first value. */}
      <form action={action} key={JSON.stringify(state?.values ?? {})}>
        <FormSection title="Cargo details">
          <Field label="Cargo received date" error={f.receivedAt}>
            <Input name="receivedAt" type="datetime-local" defaultValue={v.receivedAt ?? now} required />
          </Field>
          <Field label="Supplier details">
            <Input name="supplier" defaultValue={v.supplier} placeholder="Enter supplier details" />
          </Field>
          <Field label="Supplier's tracking number">
            <Input name="supplierTrackingNo" defaultValue={v.supplierTrackingNo} placeholder="Enter tracking number" />
          </Field>
          <Field label="Order number">
            <Input name="orderNo" defaultValue={v.orderNo} placeholder="Enter order number" />
          </Field>
          <Field label="No. of packages" error={f.packages}>
            <Input name="packages" type="number" min={1} step={1} defaultValue={v.packages} placeholder="Enter package number" required />
          </Field>
          <Field label="Volume type" error={f.volumeUnit}>
            <Select name="volumeUnit" defaultValue={v.volumeUnit ?? "cbm"} options={[{ value: "cbm", label: "CBM (cubic metres)" }, { value: "kg", label: "KG (weight)" }]} />
          </Field>
          <Field label="Volume" error={f.volume}>
            <Input name="volume" type="number" min={0} step="any" defaultValue={v.volume} placeholder="Set volume" required />
          </Field>
          <Field label="Cargo type">
            <Select name="cargoType" defaultValue={v.cargoType} placeholder="Select cargo type" options={CARGO_TYPES.map((t) => ({ value: t, label: t }))} />
          </Field>
          <Field label="Value ($)" error={f.valueUsd}>
            <Input name="valueUsd" type="number" min={0} step="0.01" defaultValue={v.valueUsd} placeholder="Declared value in USD" />
          </Field>
          <div className="sm:col-span-2 xl:col-span-3">
            <Field label="Description of cargo">
              <Textarea name="description" defaultValue={v.description} placeholder="What is in the packages" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Customer details">
          <Field label="Customer phone number" error={f.customerPhone}>
            <Input name="customerPhone" type="tel" list="customer-phones" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" required />
            <datalist id="customer-phones">
              {customers.map((c) => (
                <option key={c.phone} value={c.localPhone}>
                  {c.name}
                </option>
              ))}
            </datalist>
          </Field>
          <Field label="Customer name" error={f.customerName}>
            {match ? (
              <Input value={match.name} disabled readOnly />
            ) : (
              <Input name="customerName" defaultValue={v.customerName} placeholder="New customer: enter name" />
            )}
          </Field>
          <Field label="Destination country">
            <Select name="destinationCountry" defaultValue={v.destinationCountry ?? "Tanzania"} disabled={!!match} options={COUNTRIES.map((c) => ({ value: c, label: c }))} />
          </Field>
          <p className="self-end pb-3 text-xs text-muted">{match ? "Existing customer" : phone ? "Not found: a new customer will be created" : ""}</p>
        </FormSection>

        <FormSection title="Shipment details">
          <Field label="Our tracking number" error={f.trackingNo}>
            <Input name="trackingNo" defaultValue={v.trackingNo} placeholder="Leave empty to generate" />
          </Field>
          <Field label="Add to shipment" error={f.shipmentId}>
            <Select name="shipmentId" defaultValue={v.shipmentId} placeholder="Not yet (stays in warehouse)" options={shipments.map((s) => ({ value: s.id, label: s.label }))} />
          </Field>
        </FormSection>

        <SubmitBar label="Record New Cargo" pending={pending} error={state?.error} />
      </form>
    </FormPage>
  );
}
