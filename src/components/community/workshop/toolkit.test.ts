import { describe, expect, it } from "vitest";
import { CATALOG, SECTIONS, TOOL_IDS } from "./toolCatalog";
import { coerceSpec, inputRows } from "./specValues";
import { SPECS } from "./toolSpecs";
import { summarizeTool } from "./toolSummaries";
import { TOPICS } from "./workshopContent";

const CUSTOM = ["yourself", "income", "accounts", "car", "house", "debt", "marriage", "vacation"];

describe("the toolkit's shape", () => {
  it("has six sections of six tools, with no tool twice", () => {
    expect(SECTIONS.map((s) => s.title)).toEqual(["Live", "Give", "Grow", "Owe", "Estate planning", "Other financial goals"]);
    for (const s of SECTIONS) expect(s.tools).toHaveLength(6);
    expect(TOOL_IDS).toHaveLength(36);
    expect(new Set(TOOL_IDS).size).toBe(36);
  });

  it("gives every tool a name, a description, and a screen", () => {
    for (const id of TOOL_IDS) {
      expect(CATALOG[id].title.length).toBeGreaterThan(3);
      expect(CATALOG[id].text.length).toBeGreaterThan(10);
      expect(Boolean(SPECS[id]) !== CUSTOM.includes(id)).toBe(true);
    }
  });

  it("points every meeting topic at a real tool", () => {
    for (const t of TOPICS) expect((TOOL_IDS as readonly string[]).includes(t.tool)).toBe(true);
  });

  it("covers the five core estate documents, then a tax estimator", () => {
    expect(SECTIONS.find((s) => s.id === "estate")!.tools.map((id) => CATALOG[id].title)).toEqual([
      "Last will and testament",
      "Revocable living trust",
      "Durable power of attorney",
      "Health care power of attorney",
      "Living will (advance directive)",
      "Income tax estimator",
    ]);
  });
});

describe("spec tools", () => {
  it("compute sensible results from their starting numbers, with no NaN", () => {
    for (const [id, spec] of Object.entries(SPECS)) {
      const out = spec!.compute(coerceSpec(spec!, undefined));
      expect(out.results.length, id).toBeGreaterThan(0);
      for (const r of out.results) expect(`${r.label}${r.value}${r.note ?? ""}`, id).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it("keeps good saved values and ignores bad ones", () => {
    const spec = SPECS.church!;
    const v = coerceSpec(spec, { percent: 12, base: "net", freq: "nonsense", gross: -5, junk: 1 });
    expect(v.percent).toBe(12);
    expect(v.base).toBe("net");
    expect(v.freq).toBe("26"); // not a real choice, so the default
    expect(v.gross).toBe(4200); // negative, so the default
    expect("junk" in v).toBe(false);
  });

  it("reads lists, including the older budget's {label, amount} lines", () => {
    const spec = SPECS.budget!;
    const v = coerceSpec(spec, { needs: [{ id: "x", label: "Rent", amount: 900 }, { label: "Food", amount: null }, "junk"], wants: "nope" });
    const needs = v.needs as { name: string; amount: number }[];
    expect(needs.map((i) => [i.name, i.amount])).toEqual([["Rent", 900], ["Food", 0]]);
    expect((v.wants as unknown[]).length).toBeGreaterThan(0); // fell back to the default list
  });

  it("budgets with needs, wants, and wishes, and shows what is left", () => {
    const out = SPECS.budget!.compute(
      coerceSpec(SPECS.budget!, { income: [{ name: "Pay", amount: 3000 }], needs: [{ name: "Rent", amount: 1500 }], wants: [{ name: "Fun", amount: 600 }], wishes: [{ name: "Trip", amount: 300 }] }),
    );
    const row = (l: string) => out.results.find((r) => r.label.startsWith(l))!;
    expect(row("Needs").value).toBe("$1,500");
    expect(row("Needs").note).toContain("50%");
    expect(row("Left for").value).toBe("$600");
  });

  it("gives the estate documents a status and a count of decisions", () => {
    const will = SPECS.will!;
    const out = will.compute(coerceSpec(will, { status: "signed", executor: "Sam", guardian: "Pat" }));
    expect(out.results[0]).toMatchObject({ label: "Status", value: "Signed and stored safely" });
    expect(out.results[1].value).toBe("2 of 6");
    expect(out.notes!.join(" ")).toContain("licensed estate planning attorney");
  });

  it("prints a spec tool's inputs and results for the PDF", () => {
    const snap = summarizeTool("moving", { newRent: 2000 });
    expect(snap.filledIn).toBe(true);
    expect(snap.sections.map((s) => s.heading)).toEqual(["Numbers used", "What it shows"]);
    const rows = inputRows(SPECS.moving!, coerceSpec(SPECS.moving!, { newRent: 2000 }));
    expect(rows.find(([l]) => l === "New rent, per month")![1]).toBe("$2,000.00");
    expect(summarizeTool("will", undefined).sections[0].heading).toBe("Your plan");
  });
});

describe("tax rates worked out from income", () => {
  const rows = (id: "charity" | "business", saved: unknown) => {
    const spec = SPECS[id]!;
    const v = coerceSpec(spec, saved);
    return { v, out: spec.compute(v), rows: inputRows(spec, v) };
  };

  it("works a gift's tax rate out from the income, and says so, unless the person sets their own", () => {
    const auto = rows("charity", { itemize: "yes", monthly: 100, income: 60000 });
    expect(auto.v.taxMode).toBe("auto");
    // $60,000 single is in the 12% bracket: $1,200 a year of gifts saves $144.
    expect(auto.out.results.find((r) => r.label === "Tax savings each year")!.value).toBe("$144");
    expect(auto.rows.find(([k]) => k === "Your tax rate on a gift")![1]).toBe("12% (estimated from income)");
    const higher = rows("charity", { itemize: "yes", monthly: 100, income: 100000 });
    expect(higher.out.results.find((r) => r.label === "Tax savings each year")!.value).toBe("$264"); // the 22% bracket
    const own = rows("charity", { itemize: "yes", monthly: 100, income: 60000, tax: 30, taxMode: "manual" });
    expect(own.out.results.find((r) => r.label === "Tax savings each year")!.value).toBe("$360");
    expect(own.rows.find(([k]) => k === "Your tax rate on a gift")![1]).toBe("30%");
  });

  it("keeps a tax rate that was typed in before rates could be estimated", () => {
    const old = rows("charity", { itemize: "yes", monthly: 100, tax: 24 });
    expect(old.v.taxMode).toBe("manual");
    expect(old.out.results.find((r) => r.label === "Tax savings each year")!.value).toBe("$288");
  });

  it("sets aside self-employment tax and income tax on a side business", () => {
    // $900 a month of profit is $10,800 a year: self-employment tax only, 14.1%, so $126.9 of $900 is set aside.
    const b = rows("business", { revenue: 1500, costs: 600, startup: 0, hours: 10 });
    expect(b.out.results.find((r) => r.label === "Kept each month, after tax")!.value).toBe("$773");
    const withJob = rows("business", { revenue: 1500, costs: 600, startup: 0, hours: 10, other: 60000 });
    const keep = (x: typeof b) => Number(x.out.results.find((r) => r.label === "Kept each month, after tax")!.value.replace(/[$,]/g, ""));
    expect(keep(withJob)).toBeLessThan(keep(b));
  });

  it("shows the estimated rate in the Accounts and Income summaries, and the typed one when chosen", () => {
    const acc = summarizeTool("accounts", { income: 100000 });
    expect(acc.sections[0].rows).toContainEqual(["Tax rate now", "22% (estimated from income)"]);
    const own = summarizeTool("accounts", { now: 30, nowMode: "manual" });
    expect(own.sections[0].rows).toContainEqual(["Tax rate now", "30%"]);
    const inc = summarizeTool("income", { gross: 500, base: 0 });
    expect(inc.sections[0].rows.find(([k]) => k === "Estimated tax")![1]).toBe("7.7% (estimated from income)");
    const old = summarizeTool("income", { gross: 500, tax: 20 });
    expect(old.sections[0].rows.find(([k]) => k === "Estimated tax")![1]).toBe("20%");
  });
});
