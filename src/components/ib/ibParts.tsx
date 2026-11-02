import type { ReactNode } from "react";

export const cellCls =
  "w-full min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm tabular-nums text-ink focus:border-water focus:outline-none";
export const labelCls = "flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft";

/** The sub-tabs inside a page: a row of buttons that act as a tab list. */
export function SubTabs<T extends string>({ label, tabs, value, onChange, prefix }: { label: string; tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void; prefix: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-xl bg-parchment-deep p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`${prefix}-tab-${t.id}`}
          aria-selected={value === t.id}
          aria-controls={`${prefix}-panel-${t.id}`}
          onClick={() => onChange(t.id)}
          className={`min-w-[110px] flex-1 whitespace-nowrap rounded-lg px-3 py-2 font-[family-name:var(--font-ui)] text-sm font-medium transition-colors ${value === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ prefix, id, children }: { prefix: string; id: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`${prefix}-panel-${id}`} aria-labelledby={`${prefix}-tab-${id}`}>
      {children}
    </div>
  );
}

/** A table of numbers: a title row (columns) and rows of cells. Right-aligned numbers. */
export function NumTable({ caption, head, rows, corner }: { caption: string; head: string[]; rows: { label: string; cells: string[]; bold?: boolean }[]; corner?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse font-[family-name:var(--font-ui)] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-xs text-ink-soft">
            <th className="py-2 pr-3 text-left font-medium">{corner ?? ""}</th>
            {head.map((h) => (
              <th key={h} className="py-2 pr-3 text-right font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className={`border-b border-line/60 ${r.bold ? "font-semibold" : ""}`}>
              <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">
                {r.label}
              </th>
              {r.cells.map((c, i) => (
                <td key={i} className="py-2 pr-3 text-right tabular-nums text-ink">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The educational notice shown on each page of these tools. */
export function EducationNote({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="rounded-xl border border-line bg-parchment-deep px-5 py-3 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
      {children}
    </p>
  );
}
