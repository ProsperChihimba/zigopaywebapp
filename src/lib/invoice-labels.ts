import type { Tone } from "@/components/badge";

export const INVOICE_STATUS = {
  unpaid: { label: "Unpaid", tone: "orange" },
  partly_paid: { label: "Partly paid", tone: "yellow" },
  paid: { label: "Paid", tone: "green" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const ACCOUNT_STATUS = {
  pending: { label: "Opening…", tone: "grey" },
  created: { label: "Ready", tone: "green" },
  failed: { label: "Failed", tone: "red" },
  uncertain: { label: "Check with Daraja", tone: "red" },
} as const satisfies Record<string, { label: string; tone: Tone }>;
