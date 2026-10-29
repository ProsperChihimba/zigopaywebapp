/**
 * Converts a phone number to international format (+255…), as Mifumo, Daraja and WhatsApp need.
 * 0712345678, 255712345678, 712345678 and +255712345678 all become +255712345678.
 * Returns null when the result is not a plausible number.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.replace(/[\s()-]/g, "");
  let digits: string;
  if (raw.startsWith("+")) digits = raw.slice(1);
  else if (raw.startsWith("255")) digits = raw;
  else if (raw.startsWith("0")) digits = `255${raw.slice(1)}`;
  else if (/^[67]\d{8}$/.test(raw)) digits = `255${raw}`;
  else digits = raw;
  return /^\d{9,15}$/.test(digits) ? `+${digits}` : null;
}

/** "+255678232322" shown as "0678 232 322" for Tanzanian numbers. */
export function displayPhone(phone: string) {
  const m = /^\+255(\d{3})(\d{3})(\d{3})$/.exec(phone);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : phone;
}
