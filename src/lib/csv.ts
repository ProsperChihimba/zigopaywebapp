/**
 * One CSV cell. Text that starts like a formula (=, +, -, @) gets a leading quote mark, so a
 * payer name from bank data can't run as a formula when the file is opened in Excel.
 */
function cell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
