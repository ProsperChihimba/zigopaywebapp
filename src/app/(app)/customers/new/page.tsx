"use client";

import { useActionState } from "react";
import { Field, FormPage, FormSection, Input, Select, SubmitBar } from "@/components/form";
import { COUNTRIES } from "@/lib/labels";
import { createCustomer } from "../actions";

export default function NewCustomerPage() {
  const [state, action, pending] = useActionState(createCustomer, undefined);
  const v = state?.values ?? {};
  const f = state?.fields ?? {};

  return (
    <FormPage back="/customers" title="Register New Customer">
      {/* Remount after a rejected submit: React resets forms after an action, and selects would snap back to their first value. */}
      <form action={action} key={JSON.stringify(state?.values ?? {})}>
        <FormSection title="Customer details">
          <Field label="Customer name" error={f.name}>
            <Input name="name" defaultValue={v.name} placeholder="Enter customer name" required />
          </Field>
          <Field label="Customer phone" error={f.phone}>
            <Input name="phone" type="tel" defaultValue={v.phone} placeholder="0712 345 678" required />
          </Field>
          <Field label="Destination country" error={f.destinationCountry}>
            <Select name="destinationCountry" defaultValue={v.destinationCountry ?? "Tanzania"} options={COUNTRIES.map((c) => ({ value: c, label: c }))} />
          </Field>
        </FormSection>
        <SubmitBar label="Save customer" pending={pending} error={state?.error} />
      </form>
    </FormPage>
  );
}
