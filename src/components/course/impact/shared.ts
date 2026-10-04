export interface StreamRow {
  id: string;
  label: string;
  monthly: string;
}

export interface DebtRow {
  id: string;
  name: string;
  balance: string;
  apr: string;
  min: string;
}

let seq = 0;
export const newId = (prefix: string) => `${prefix}-${++seq}`;

/** Parses a form field to a number; anything unparseable counts as zero. */
export function num(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function newStream(label = "", monthly = ""): StreamRow {
  return { id: newId("stream"), label, monthly };
}

export function newDebt(name = "", balance = "", apr = "", min = ""): DebtRow {
  return { id: newId("debt"), name, balance, apr, min };
}

/** "27 months" -> "2 yr 3 mo". */
export function formatMonths(months: number, units: { yr: string; mo: string } = { yr: "yr", mo: "mo" }): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} ${units.mo}`;
  return rest === 0 ? `${years} ${units.yr}` : `${years} ${units.yr} ${rest} ${units.mo}`;
}
