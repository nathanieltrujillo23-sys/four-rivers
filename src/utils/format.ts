const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const currencyWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number, whole = false): string {
  const safe = Number.isFinite(value) ? value : 0;
  return (whole ? currencyWhole : currency).format(safe);
}

export function formatPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) return "0%";
  return `${Math.round(fraction * 100)}%`;
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

/** Format a date-only string (YYYY-MM-DD) without the UTC-midnight day shift. */
export function formatDateOnly(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "";
  return dateFmt.format(new Date(y, m - 1, d));
}

/** Today as YYYY-MM-DD in the viewer's local time. */
export function todayYmd(): string {
  const n = new Date();
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const dd = String(n.getDate()).padStart(2, "0");
  return `${n.getFullYear()}-${mm}-${dd}`;
}
