/**
 * Turns a workbook description (excel.ts) into an .xlsx file with ExcelJS, which is loaded only when someone exports. Formulas are
 * written as formulas, so the file recalculates in Excel, Numbers and Google Sheets.
 */
import type ExcelJS from "exceljs";
import type { XBook, XCell, XFormat, XStyle } from "./excel";

const FORMATS: Record<XFormat, string> = {
  m1: '#,##0.0;(#,##0.0);"-"',
  pct: "0.0%",
  pct2: "0.00%",
  x: '0.0"x"',
  usd2: "$#,##0.00",
  usd0: "$#,##0;($#,##0)",
  int: "#,##0",
  dec2: "0.00",
  year: '"Year "0',
  text: "@",
};

const INK = "FF1B2733";
const BLUE = "FF1F4FD8";
const TEAL = "FF213B3F";
const SOFT = "FF55616C";

function paint(cell: ExcelJS.Cell, style: XStyle | undefined) {
  const font: Partial<ExcelJS.Font> = { name: "Calibri", size: 11, color: { argb: INK } };
  if (style === "title") cell.font = { ...font, size: 16, bold: true, color: { argb: TEAL } };
  else if (style === "section") {
    cell.font = { ...font, bold: true, color: { argb: TEAL } };
    cell.border = { bottom: { style: "thin", color: { argb: TEAL } } };
  } else if (style === "head") {
    cell.font = { ...font, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL } };
    cell.alignment = { horizontal: "right" };
  } else if (style === "input") {
    cell.font = { ...font, color: { argb: BLUE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F8FF" } };
  } else if (style === "total") {
    cell.font = { ...font, bold: true };
    cell.border = { top: { style: "thin", color: { argb: INK } } };
  } else if (style === "note") cell.font = { ...font, italic: true, color: { argb: SOFT } };
  else if (style === "good") cell.font = { ...font, bold: true, color: { argb: "FF2F6F4F" } };
  else cell.font = font;
}

export async function workbookBuffer(spec: XBook): Promise<ArrayBuffer> {
  const { default: Excel } = await import("exceljs");
  const wb = new Excel.Workbook();
  wb.creator = "4 Rivers";
  wb.title = spec.title;
  wb.created = new Date();
  // No cached results are stored, so ask the spreadsheet to calculate everything when the file opens.
  wb.calcProperties.fullCalcOnLoad = true;
  for (const sheet of spec.sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31), { views: [{ showGridLines: false }] });
    sheet.widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    sheet.rows.forEach((row, r) => {
      row.forEach((raw, c) => {
        if (raw === null || raw === undefined) return;
        const cell = ws.getCell(r + 1, c + 1);
        const x: XCell = typeof raw === "object" ? raw : { v: raw };
        if (x.f !== undefined) cell.value = { formula: x.f } as ExcelJS.CellFormulaValue;
        else if (x.v !== null && x.v !== undefined) cell.value = x.v;
        if (x.fmt) cell.numFmt = FORMATS[x.fmt];
        paint(cell, x.style ?? "label");
        if (c === 0) cell.alignment = { horizontal: "left" };
      });
    });
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

/** Builds the file and hands it to the browser as a download. */
export async function downloadWorkbook(spec: XBook): Promise<void> {
  const buf = await workbookBuffer(spec);
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = spec.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
