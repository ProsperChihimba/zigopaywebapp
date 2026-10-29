import type { LucideIcon } from "lucide-react";

const TINTS = {
  orange: { card: "bg-tint-orange", icon: "text-orange-500" },
  green: { card: "bg-tint-green", icon: "text-brand" },
  blue: { card: "bg-tint-blue", icon: "text-blue-500" },
  yellow: { card: "bg-tint-yellow", icon: "text-yellow-600" },
  grey: { card: "bg-tint-grey", icon: "text-muted" },
} as const;

export function StatCard({ label, value, icon: Icon, tint }: { label: string; value: string | number; icon: LucideIcon; tint: keyof typeof TINTS }) {
  return (
    <div className={`rounded-2xl p-5 ${TINTS[tint].card}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-white ${TINTS[tint].icon}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-4 text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 border-b border-line p-6 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
