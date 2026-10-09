import type { Field, Item, ToolSpec, Values } from "./toolSpecs";

let counter = 0;
const newId = () => `i${Date.now().toString(36)}${(counter += 1)}`;

export const newItem = (name = "", amount = 0): Item => ({ id: newId(), name, amount });

const freshList = (def: [string, number][]) => def.map(([name, amount]) => newItem(name, amount));

/** The values a spec starts with. */
export function specDefaults(fields: Field[]): Values {
  const v: Values = {};
  for (const f of fields) {
    v[f.key] = f.kind === "num" ? f.def : f.kind === "choice" ? f.def : f.kind === "text" ? (f.def ?? "") : f.kind === "area" ? "" : freshList(f.def);
  }
  return v;
}

/**
 * The saved values laid over the defaults. Anything missing or of the wrong kind falls back to the default, so an old or
 * hand-edited save can never break the tool. (A list entry may carry `name` or, from the older budget, `label`.)
 */
export function coerceSpec(spec: ToolSpec, saved: unknown): Values {
  const v = specDefaults(spec.fields);
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return v;
  const src = saved as Record<string, unknown>;
  for (const f of spec.fields) {
    const x = src[f.key];
    if (f.kind === "num" && typeof x === "number" && Number.isFinite(x) && x >= 0) v[f.key] = x;
    else if ((f.kind === "text" || f.kind === "area") && typeof x === "string") v[f.key] = x.slice(0, f.kind === "text" ? 120 : 2000);
    else if (f.kind === "choice" && typeof x === "string" && f.options.some(([k]) => k === x)) v[f.key] = x;
    else if (f.kind === "list" && Array.isArray(x)) {
      v[f.key] = x
        .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
        .slice(0, f.max)
        .map((i) => {
          const name = typeof i.name === "string" ? i.name : typeof i.label === "string" ? i.label : "";
          const amount = typeof i.amount === "number" && Number.isFinite(i.amount) && i.amount >= 0 ? i.amount : 0;
          return { id: typeof i.id === "string" ? i.id : newId(), name: name.slice(0, 60), amount };
        });
      if ((v[f.key] as Item[]).length === 0) v[f.key] = freshList(f.def);
    }
  }
  return v;
}

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

/** The numbers a person entered, as label and value rows (for the meeting PDF). */
export function inputRows(spec: ToolSpec, v: Values): [string, string][] {
  return spec.fields.map((f): [string, string] => {
    const x = v[f.key];
    if (f.kind === "num") return [f.label, f.prefix === "$" ? usd(x as number) : `${x}${f.suffix === "%" ? "%" : f.suffix ? ` ${f.suffix}` : ""}`];
    if (f.kind === "choice") return [f.label, f.options.find(([k]) => k === x)?.[1] ?? String(x)];
    if (f.kind === "list") {
      const items = (x as Item[]).filter((i) => i.name.trim() || i.amount);
      return [f.label, items.length ? items.map((i) => `${i.name.trim() || "Line"} ${usd(i.amount)}`).join(", ") : "none"];
    }
    return [f.label, String(x).trim() || "-"];
  });
}
