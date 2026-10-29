import Link from "next/link";
import { Plus, Search } from "lucide-react";

export function PageHeader({ title, action, q }: { title: string; action?: { label: string; href: string }; q?: string }) {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-line px-6 py-5">
      <h1 className="mr-auto text-lg font-semibold">{title}</h1>
      {q !== undefined && (
        <form className="relative order-last w-full sm:order-none sm:w-auto sm:max-w-md sm:flex-1" role="search">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search"
            aria-label={`Search ${title.toLowerCase()}`}
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </form>
      )}
      {action && (
        <Link href={action.href} className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          <Plus className="h-4 w-4" /> {action.label}
        </Link>
      )}
    </header>
  );
}
