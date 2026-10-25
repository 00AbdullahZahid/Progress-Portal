/** Escape one CSV field, including spreadsheet formula-injection hardening. */
export function csvField(value: string | number | boolean | null | undefined): string {
  let text = value == null ? "" : String(value);
  // A leading =, +, -, @, tab, or carriage return can be interpreted as a
  // formula by spreadsheet apps. Prefix user-provided strings with an apostrophe.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Build a CRLF-delimited CSV document from a header row and data rows. */
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | boolean | null | undefined)[])[]
): string {
  const lines = [headers.map(csvField).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvField).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}
