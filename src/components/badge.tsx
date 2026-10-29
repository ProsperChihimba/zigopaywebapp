const TONES = {
  orange: "bg-orange-50 text-orange-600",
  green: "bg-green-50 text-green-700",
  blue: "bg-blue-50 text-blue-600",
  yellow: "bg-yellow-50 text-yellow-700",
  violet: "bg-violet-50 text-violet-600",
  red: "bg-red-50 text-red-600",
  grey: "bg-neutral-100 text-neutral-600",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
