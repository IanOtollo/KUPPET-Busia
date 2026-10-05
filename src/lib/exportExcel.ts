export type ExcelCell = string | number | null | undefined;

export interface ExcelColumn {
  header: string;
  /** Force text format (phone / TSC numbers) so Excel keeps leading zeros and full digits. */
  text?: boolean;
  /** Number format for numeric columns, e.g. '#,##0'. */
  numFmt?: string;
}

/** Neutralise spreadsheet formula injection in user-supplied text. */
function safeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/**
 * Builds a formatted .xlsx (auto-fit columns, bold coloured frozen header, filter arrows)
 * and triggers a browser download. exceljs is loaded on demand so it stays out of the main bundle.
 */
export async function downloadExcel(opts: {
  fileName: string;
  sheetName: string;
  columns: ExcelColumn[];
  rows: ExcelCell[][];
}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(opts.sheetName.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = opts.columns.map((c) => ({ header: c.header, key: c.header }));

  opts.rows.forEach((row) => {
    ws.addRow(
      row.map((cell, i) => {
        if (cell === null || cell === undefined) return "";
        if (opts.columns[i].text) return safeText(String(cell));
        return typeof cell === "string" ? safeText(cell) : cell;
      })
    );
  });

  ws.columns.forEach((col, i) => {
    const def = opts.columns[i];
    let max = def.header.length;
    ws.getColumn(i + 1).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber === 1) return;
      max = Math.max(max, String(cell.value ?? "").length);
    });
    col.width = Math.min(Math.max(max + 3, 10), 60);
    if (def.text) ws.getColumn(i + 1).numFmt = "@";
    else if (def.numFmt) ws.getColumn(i + 1).numFmt = def.numFmt;
  });

  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3D5C" } };
    cell.alignment = { vertical: "middle" };
  });
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: opts.columns.length },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = opts.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
