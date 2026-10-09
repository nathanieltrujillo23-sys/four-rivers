import { useEffect, useRef, useState } from "react";
import { useCopy } from "../../../lib/copy";
import { Button } from "../../ui/Button";
import { Select, TextArea } from "../../ui/Field";
import { Num, Stat, type ToolProps } from "./scenarioTools";
import { coerceSpec, newItem } from "./specValues";
import type { Field, Item, ToolSpec, Values } from "./toolSpecs";

/** A tool drawn from its spec: the intro, the fields, the results as tiles, and the notes. */
export function SpecTool({ id, spec, initial, onState }: { id: string; spec: ToolSpec } & ToolProps) {
  const copy = useCopy();
  const [v, setV] = useState<Values>(() => coerceSpec(spec, initial));
  const report = useRef(onState);
  useEffect(() => {
    report.current = onState;
  });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    report.current?.(v);
  }, [v]);

  const set = (key: string, value: Values[string]) => setV((p) => ({ ...p, [key]: value }));
  const out = spec.compute(v);
  const numFields = spec.fields.filter((f) => f.kind === "num" || f.kind === "choice" || f.kind === "text");
  const wide = spec.fields.filter((f) => f.kind === "list" || f.kind === "area");

  return (
    <div className="flex flex-col gap-4">
      {spec.intro?.map((p, i) => (
        <p key={i} className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {copy(`toolkit:intro:${id}:${i}`, p)}
        </p>
      ))}
      {numFields.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {numFields.map((f) => (
            <FieldInput key={f.key} f={f} v={v} set={set} />
          ))}
        </div>
      )}
      {wide.map((f) => (
        <FieldInput key={f.key} f={f} v={v} set={set} />
      ))}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {out.results.map((r) => (
          <Stat key={r.label} label={r.label} value={r.value} note={r.note} strong={r.strong} />
        ))}
      </div>
      {out.notes?.map((n, i) => (
        <p key={i} className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          {copy(`toolkit:note:${id}:${i}`, n)}
        </p>
      ))}
    </div>
  );
}

function FieldInput({ f, v, set }: { f: Field; v: Values; set: (key: string, value: Values[string]) => void }) {
  if (f.kind === "num") {
    return <Num label={f.label} prefix={f.prefix} suffix={f.suffix} step={f.step} value={v[f.key] as number} onChange={(x) => set(f.key, x)} />;
  }
  if (f.kind === "text") {
    return (
      <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
        <span>{f.label}</span>
        <input
          value={v[f.key] as string}
          maxLength={120}
          onChange={(e) => set(f.key, e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink focus:border-water focus:outline-none"
        />
      </label>
    );
  }
  if (f.kind === "area") {
    return (
      <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
        <span>{f.label}</span>
        <TextArea rows={3} maxLength={2000} value={v[f.key] as string} onChange={(e) => set(f.key, e.target.value)} />
        {f.hint && <span className="font-normal">{f.hint}</span>}
      </label>
    );
  }
  if (f.kind === "choice") {
    return (
      <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
        <span>{f.label}</span>
        <Select value={v[f.key] as string} onChange={(e) => set(f.key, e.target.value)}>
          {f.options.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </label>
    );
  }
  const items = v[f.key] as Item[];
  const change = (next: Item[]) => set(f.key, next);
  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-3">
      <legend className="px-1 text-sm font-semibold text-ink">{f.label}</legend>
      {items.map((item, i) => (
        <div key={item.id} className="grid grid-cols-[1fr_7.5rem_auto] items-end gap-2">
          <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
            <span className="sr-only">
              {f.label} line {i + 1} {f.nameLabel}
            </span>
            <input
              value={item.name}
              maxLength={60}
              placeholder={f.nameLabel}
              onChange={(e) => change(items.map((x) => (x.id === item.id ? { ...x, name: e.target.value } : x)))}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink focus:border-water focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
            <span className="sr-only">
              {f.label} line {i + 1} {f.amountLabel}
            </span>
            <span className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-2 text-base text-ink focus-within:border-water">
              <span className="text-ink-soft">$</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={item.amount === 0 ? "" : item.amount}
                placeholder="0"
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  change(items.map((x) => (x.id === item.id ? { ...x, amount: Number.isFinite(n) ? Math.max(0, n) : 0 } : x)));
                }}
                className="w-full min-w-0 bg-transparent tabular-nums outline-none"
              />
            </span>
          </label>
          <Button variant="ghost" aria-label={`Remove ${item.name || "line"}`} disabled={items.length <= 1} onClick={() => change(items.filter((x) => x.id !== item.id))}>
            Remove
          </Button>
        </div>
      ))}
      <div>
        <Button variant="ghost" disabled={items.length >= f.max} onClick={() => change([...items, newItem()])}>
          Add {f.add === "income" ? "an income line" : `a ${f.add}`}
        </Button>
      </div>
    </fieldset>
  );
}
