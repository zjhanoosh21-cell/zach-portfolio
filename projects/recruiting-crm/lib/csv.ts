/**
 * Minimal CSV builder — no external dependency.
 * Handles commas, double-quotes, and newlines inside values.
 */

export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined): string => {
    if (v == null) return "";
    const s = String(v);
    // Wrap in quotes if the value contains comma, double-quote, or newline
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];

  // BOM prefix so Excel opens UTF-8 correctly without encoding issues
  return "\uFEFF" + lines.join("\r\n");
}

export function csvResponse(content: string, filename: string): Response {
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
