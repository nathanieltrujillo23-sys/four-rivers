/**
 * Test-only: evaluates a workbook description with a formula engine, so each model's Excel formulas can be compared with
 * the numbers the app itself shows. (HyperFormula is a dev dependency and never ships in the app.)
 */
import { HyperFormula, type RawCellContent } from "hyperformula";
import type { XBook, XSheet, XValue } from "./excel";

const raw = (c: XValue): RawCellContent => {
  if (c === null || c === undefined) return null;
  if (typeof c !== "object") return c;
  if (c.f !== undefined) return `=${c.f}`;
  return c.v ?? null;
};

export function evaluate(spec: XBook | XSheet[]) {
  const sheets = Array.isArray(spec) ? spec : spec.sheets;
  const hf = HyperFormula.buildFromSheets(Object.fromEntries(sheets.map((s) => [s.name, s.rows.map((r) => r.map(raw))])), { licenseKey: "gpl-v3" });
  /** The value at an address such as "$B$12" or "C7" on a sheet. */
  const get = (sheet: string, address: string): number | string | null => {
    const id = hf.getSheetId(sheet);
    if (id === undefined) throw new Error(`no sheet ${sheet}`);
    const a = hf.simpleCellAddressFromString(address.replace(/\$/g, ""), id);
    if (!a) throw new Error(`bad address ${address}`);
    const v = hf.getCellValue(a);
    if (v !== null && typeof v === "object") throw new Error(`${sheet}!${address}: ${JSON.stringify(v)}`);
    return v as number | string | null;
  };
  const num = (sheet: string, address: string): number => {
    const v = get(sheet, address);
    if (typeof v !== "number") throw new Error(`${sheet}!${address} is not a number: ${String(v)}`);
    return v;
  };
  /** Every formula cell that evaluated to an error, as "Sheet!A1: message". */
  const errors = (): string[] => {
    const out: string[] = [];
    for (const s of sheets) {
      const id = hf.getSheetId(s.name)!;
      s.rows.forEach((row, r) => row.forEach((_, c) => {
        const v = hf.getCellValue({ sheet: id, row: r, col: c });
        if (v !== null && typeof v === "object") out.push(`${s.name}!${hf.simpleCellAddressToString({ sheet: id, row: r, col: c }, id)}: ${JSON.stringify(v)}`);
      }));
    }
    return out;
  };
  return { get, num, errors };
}
