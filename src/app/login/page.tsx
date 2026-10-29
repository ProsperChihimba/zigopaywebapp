"use client";

import { useActionState } from "react";
import { Logo } from "@/components/logo";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={action} className="w-full max-w-sm rounded-3xl border border-line bg-white p-8">
        <Logo />
        <h1 className="mt-8 text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Staff access to your company&apos;s Zigopay.</p>

        <label className="mt-6 block text-sm">
          Email
          <input name="email" type="email" required autoComplete="email" defaultValue={state?.email} className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand" />
        </label>
        <label className="mt-4 block text-sm">
          Password
          <input name="password" type="password" required autoComplete="current-password" className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand" />
        </label>

        {state && <p className="mt-4 text-sm text-red-600" role="alert">{state.error}</p>}

        <button disabled={pending} className="mt-6 w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
