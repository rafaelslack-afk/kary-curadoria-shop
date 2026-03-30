/**
 * Converte array de objetos em CSV e dispara download no browser.
 */
export function exportToCsv(filename: string, data: Record<string, unknown>[]): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);

  const escape = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    // Wrap in quotes if contains comma, newline or quote
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = [
    headers.map(escape).join(","),
    ...data.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];

  const blob = new Blob(["\uFEFF" + rows.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
