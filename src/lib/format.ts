const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Africa/Dar_es_Salaam",
});
const dateOnly = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Africa/Dar_es_Salaam",
});
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** "Aug 15, 2025 18:21", in East Africa Time, as in the Figma tables. */
export function formatDateTime(d: Date | null | undefined) {
  if (!d) return "-";
  const p = Object.fromEntries(dateTime.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.month} ${p.day}, ${p.year} ${p.hour}:${p.minute}`;
}
export const formatDate = (d: Date | null | undefined) => (d ? dateOnly.format(d) : "-");
export const formatNumber = (n: string | number | null | undefined) => (n == null || n === "" ? "-" : number.format(Number(n)));
export const formatTzs = (n: string | number) => `TZS ${number.format(Number(n))}`;
