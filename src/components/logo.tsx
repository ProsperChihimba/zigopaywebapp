export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-[26px] font-bold tracking-tight text-ink ${className}`}>
      <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden="true">
        <path d="M2 3h24v6L11 21h15v4H2v-6L17 7H2z" fill="var(--color-brand)" />
        <path d="M2 3h24v3H2z" fill="#1f6b2a" />
      </svg>
      <span>igoPay</span>
    </span>
  );
}
