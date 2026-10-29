import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 25;

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-tint-grey text-xs text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap border-b border-line px-4 py-3 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:border-b [&_td]:border-line [&_td]:px-4 [&_td]:py-3.5 [&_td]:whitespace-nowrap">{children}</tbody>
      </table>
      {empty && <p className="px-6 py-16 text-center text-sm text-muted">{empty}</p>}
    </div>
  );
}

export function Pagination({ page, total, params }: { page: number; total: number; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries({ ...params, page: String(p) }).filter((e): e is [string, string] => !!e[1]));
    return `?${q}`;
  };
  const step = "flex h-7 w-7 items-center justify-center rounded-md border border-line";

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-5 text-sm text-muted">
      <span>
        Showing {first}-{last} of {total} rows
      </span>
      <span className="flex items-center gap-3">
        {page > 1 ? (
          <Link href={href(page - 1)} className={step} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className={`${step} opacity-40`}>
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
        <span className="text-ink">
          {page} of {pages}
        </span>
        {page < pages ? (
          <Link href={href(page + 1)} className={step} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className={`${step} opacity-40`}>
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </span>
    </div>
  );
}

/** Reads ?page= safely. */
export const pageFrom = (value: string | undefined) => Math.max(1, Number.parseInt(value ?? "1", 10) || 1);

export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-ink hover:text-brand hover:underline">
      {children}
    </Link>
  );
}
