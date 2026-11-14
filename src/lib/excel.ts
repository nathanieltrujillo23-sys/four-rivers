/**
 * A plain description of an Excel workbook: sheets of cells that are either typed values or live formulas. The models describe
 * their workbook with this (so it can be checked in tests with a formula engine), and excelWrite.ts turns it into an .xlsx file.
 *
 * Conventions, the ones bankers use: inputs are blue, formulas are black, and every formula points at cells (no numbers buried
 * inside formulas), so changing a blue cell reworks the whole sheet in Excel.
 */

/** Number formats by name: millions with one decimal, a percent, a multiple, dollars and cents, whole numbers, years. */
export type XFormat = "m1" | "pct" | "pct2" | "x" | "usd2" | "usd0" | "int" | "dec2" | "year" | "text";
export type XStyle = "title" | "section" | "head" | "label" | "input" | "calc" | "total" | "note" | "good";

export interface XCell {
  /** A typed value. */
  v?: string | number | null;
  /** A formula, without the leading "=". */
  f?: string;
  fmt?: XFormat;
  style?: XStyle;
}
export type XValue = XCell | string | number | null;

export interface XSheet {
  name: string;
  /** Column widths in characters, from column A. */
  widths: number[];
  rows: XValue[][];
}
export interface XBook {
  filename: string;
  title: string;
  sheets: XSheet[];
}

/** "A", "B", ... "Z", "AA" for a 0-based column. */
export function colName(i: number): string {
  let s = "";
  for (let k = i + 1; k > 0; k = Math.floor((k - 1) / 26)) s = String.fromCharCode(65 + ((k - 1) % 26)) + s;
  return s;
}
/** A relative address like "C12" (0-based column, 1-based row). */
export const at = (col: number, row: number) => `${colName(col)}${row}`;
/** An absolute address like "$C$12". */
export const abs = (col: number, row: number) => `$${colName(col)}$${row}`;

export const inp = (v: number | string, fmt: XFormat = "m1"): XCell => ({ v, fmt, style: "input" });
export const fx = (f: string, fmt: XFormat = "m1", style: XStyle = "calc"): XCell => ({ f, fmt, style });
export const head = (v: string | number, fmt?: XFormat): XCell => ({ v, style: "head", fmt });

/**
 * Builds one sheet top to bottom. Each helper adds a row and returns where its value went, so later formulas point at cells
 * by name instead of by hand-counted addresses.
 */
export class Grid {
  rows: XValue[][] = [];
  name: string;
  widths: number[];
  constructor(name: string, widths: number[] = [38, 14, 14, 14, 14, 14, 14]) {
    this.name = name;
    this.widths = widths;
  }
  /** The row number the next added row will get. */
  get next(): number {
    return this.rows.length + 1;
  }
  /** Adds a row of cells and returns its 1-based row number. */
  add(...cells: XValue[]): number {
    this.rows.push(cells);
    return this.rows.length;
  }
  blank(): number {
    return this.add();
  }
  title(text: string, note?: string): void {
    this.add({ v: text, style: "title" });
    if (note) this.add({ v: note, style: "note" });
    this.blank();
  }
  section(text: string): number {
    return this.add({ v: text, style: "section" });
  }
  note(text: string): number {
    return this.add({ v: text, style: "note" });
  }
  /** A labelled input in column B. Returns its absolute address. */
  input(label: string, value: number | string, fmt: XFormat = "m1"): string {
    const row = this.add({ v: label, style: "label" }, inp(value, fmt));
    return abs(1, row);
  }
  /** A labelled formula in column B. Returns its absolute address. */
  calc(label: string, formula: string, fmt: XFormat = "m1", style: XStyle = "calc"): string {
    const row = this.add({ v: label, style: style === "total" ? "total" : "label" }, fx(formula, fmt, style));
    return abs(1, row);
  }
  /** A labelled row of several cells from column B on. Returns the row number. */
  series(label: string, cells: XValue[], style: XStyle = "label"): number {
    return this.add({ v: label, style }, ...cells);
  }
  sheet(): XSheet {
    return { name: this.name, widths: this.widths, rows: this.rows };
  }
}

/** The first sheet of every workbook: what it is, the colour conventions, and the educational notice. */
export function aboutSheet(title: string, lines: string[] = []): XSheet {
  const g = new Grid("About", [110]);
  g.add({ v: title, style: "title" });
  g.add({ v: "Made with 4 Rivers, Daily Bread tools.", style: "note" });
  g.blank();
  g.add({ v: "How to read this workbook", style: "section" });
  g.add("Blue cells are inputs: type over them. Black cells are formulas: they rework themselves when an input changes.");
  g.add("Percents are entered as percents (type 8% or 0.08). Amounts are in the unit named at the top of each sheet.");
  for (const l of lines) g.add(l);
  g.blank();
  g.add({ v: "Educational use only", style: "section" });
  g.add("This is a teaching model built from numbers a student entered. It simplifies what a professional model carries.");
  g.add("It is not investment, tax, legal or accounting advice, not a valuation of any real security, and not a recommendation of any transaction.");
  return g.sheet();
}

export const safeFile = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "Model";

/** A workbook with the About sheet first. */
export function book(title: string, sheets: XSheet[], about: string[] = []): XBook {
  return { filename: `${safeFile(title)}.xlsx`, title, sheets: [aboutSheet(title, about), ...sheets] };
}
