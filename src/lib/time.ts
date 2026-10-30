/** Midnight today and the 1st of this month, in East Africa Time (UTC+3, no daylight saving). */
export function eatStarts(now = Date.now()) {
  const eat = new Date(now + 3 * 3600_000);
  const day = new Date(Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate()) - 3 * 3600_000);
  const month = new Date(Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), 1) - 3 * 3600_000);
  return { day, month };
}
