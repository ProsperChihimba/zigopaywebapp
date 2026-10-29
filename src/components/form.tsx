import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

const control = "mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand disabled:bg-tint-grey";

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      {label}
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function Select({ options, placeholder, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select {...props} className={control}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={control} />;
}

/** A numbered form section with the green tick, as in the Figma forms. */
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-3 text-xs font-semibold tracking-wide uppercase">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Check className="h-3.5 w-3.5" />
        </span>
        {title}
        <span className="h-px flex-1 bg-line" />
      </h2>
      <div className="mt-5 grid gap-5 border-l-2 border-brand-soft pl-6 sm:ml-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  );
}

export function FormPage({ back, title, children }: { back: string; title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-6 lg:px-10">
      <Link href={back} className="inline-flex items-center gap-2 text-sm font-medium">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mt-8 text-2xl font-medium">{title}</h1>
      {children}
    </div>
  );
}

export function SubmitBar({ label, pending, error }: { label: string; pending: boolean; error?: string }) {
  return (
    <div className="mt-10 flex flex-col items-center gap-3 border-t border-line pt-6">
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button disabled={pending} className="w-full max-w-sm rounded-lg bg-brand py-3 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}

/** What a form's server action returns when it can't save. */
export type FormState = { error?: string; notice?: string; fields?: Record<string, string>; values?: Record<string, string> } | undefined;
