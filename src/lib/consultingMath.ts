/** The numbers behind Consulting Tools: market sizing, a profit and break-even model, and generated mental-math drills. */

const n = (v: unknown): number => {
  const x = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

/* ------------------------------------------------------------------ */
/* Market sizing                                                       */
/* ------------------------------------------------------------------ */

export interface Factor {
  id: string;
  label: string;
  value: string;
  /** Multiply by it, or divide by it. */
  op: "x" | "÷";
}
export interface SizingEstimate {
  id: string;
  title: string;
  /** What each number is for (for the top of the chain, a count such as a population). */
  factors: Factor[];
  /** A figure you know or can look up, to compare the answer against. */
  checkLabel: string;
  check: string;
  unit: string;
}

export interface SizingResult {
  total: number;
  /** Each running total after a factor. */
  running: number[];
  /** The answer divided by the known figure, or null. */
  vsCheck: number | null;
  verdict: string;
  steps: string[];
}

/** A big number the way a consultant says it: 3.2 billion, 450 thousand. */
export function plain(x: number): string {
  const a = Math.abs(x);
  const trim = (v: number) => (Math.round(v * 10) / 10).toString();
  if (a >= 1e12) return `${trim(x / 1e12)} trillion`;
  if (a >= 1e9) return `${trim(x / 1e9)} billion`;
  if (a >= 1e6) return `${trim(x / 1e6)} million`;
  if (a >= 1e3) return `${trim(x / 1e3)} thousand`;
  return trim(x);
}

export function sizing(e: SizingEstimate): SizingResult {
  let total = 1;
  const running: number[] = [];
  const used = e.factors.filter((f) => f.value.trim() !== "");
  for (const f of used) {
    const v = n(f.value);
    if (f.op === "÷") total = v === 0 ? NaN : total / v;
    else total *= v;
    running.push(total);
  }
  const ok = used.length > 0 && Number.isFinite(total);
  const check = n(e.check);
  const vsCheck = ok && check > 0 ? total / check : null;
  const verdict = !ok
    ? "Add the factors to see the estimate."
    : vsCheck == null
      ? "Add a figure you know to compare against: an estimate with no check is only a guess."
      : vsCheck >= 0.5 && vsCheck <= 2
        ? `Within a factor of two of the known figure (${vsCheck.toFixed(2)}x): a reasonable estimate.`
        : `It is ${vsCheck > 1 ? vsCheck.toFixed(1) + "x higher" : (1 / vsCheck).toFixed(1) + "x lower"} than the known figure. Re-examine the factor that you are least sure of.`;
  return {
    total: ok ? total : 0,
    running,
    vsCheck,
    verdict,
    steps: [
      "Break the question into a chain of simple factors that you can estimate (for example population × share who buy × purchases per year × price) and multiply or divide them in order.",
      ok ? `The chain gives ${plain(total)} ${e.unit}.` : "Enter a number for each factor.",
      "Round to numbers that are easy to work with and state each assumption aloud; the structure matters more than the exact value.",
      "Sanity check by comparing the answer with something you know. An answer more than a factor of two or three off means one factor is wrong.",
    ],
  };
}

export const SIZING_TEMPLATES: { title: string; unit: string; factors: [string, string, "x" | "÷"][]; checkLabel: string }[] = [
  { title: "Cups of coffee sold in a year in a country", unit: "cups a year", factors: [["Population (people)", "330000000", "x"], ["Share who drink coffee", "0.6", "x"], ["Cups per drinker per day", "2", "x"], ["Days in a year", "365", "x"]], checkLabel: "Total US coffee sales, divided by an average price" },
  { title: "Customers of a new campus delivery service", unit: "orders a week", factors: [["Students on campus", "50000", "x"], ["Share who would order in a week", "0.15", "x"], ["Orders per user per week", "1.5", "x"]], checkLabel: "A comparable service's weekly orders" },
  { title: "Annual revenue of a neighborhood gym", unit: "dollars a year", factors: [["Households within 3 miles", "40000", "x"], ["Share who belong to a gym", "0.2", "x"], ["Share of those who choose this gym", "0.08", "x"], ["Members' average spend per year", "600", "x"]], checkLabel: "A similar gym's reported revenue" },
];

/* ------------------------------------------------------------------ */
/* Profit and break-even                                               */
/* ------------------------------------------------------------------ */

export interface ProfitInputs {
  price: string;
  variableCost: string;
  fixedCost: string;
  volume: string;
}
export const defaultProfit = (): ProfitInputs => ({ price: "50", variableCost: "30", fixedCost: "400000", volume: "30000" });

export interface ProfitResult {
  valid: boolean;
  revenue: number;
  variable: number;
  contribution: number;
  contributionPerUnit: number;
  contributionMargin: number;
  profit: number;
  margin: number;
  breakEvenUnits: number | null;
  breakEvenRevenue: number | null;
  /** How far volume could fall before profit hits zero, as a share of current volume. */
  marginOfSafety: number | null;
  steps: string[];
}

export function profit(i: ProfitInputs): ProfitResult {
  const price = n(i.price);
  const vc = n(i.variableCost);
  const fixed = n(i.fixedCost);
  const vol = n(i.volume);
  const cpu = price - vc;
  const revenue = price * vol;
  const variable = vc * vol;
  const contribution = revenue - variable;
  const pr = contribution - fixed;
  const be = cpu > 0 ? fixed / cpu : null;
  return {
    valid: price > 0,
    revenue,
    variable,
    contribution,
    contributionPerUnit: cpu,
    contributionMargin: price > 0 ? cpu / price : 0,
    profit: pr,
    margin: revenue > 0 ? pr / revenue : 0,
    breakEvenUnits: be,
    breakEvenRevenue: be == null ? null : be * price,
    marginOfSafety: be != null && vol > 0 ? (vol - be) / vol : null,
    steps: [
      `Contribution per unit = price − variable cost = ${price} − ${vc} = ${cpu}. Contribution margin = that ÷ price.`,
      `Profit = (price − variable cost) × volume − fixed costs = ${cpu} × ${vol} − ${fixed} = ${pr}.`,
      be == null ? "Break-even volume is not defined when the price does not exceed the variable cost." : `Break-even volume = fixed costs ÷ contribution per unit = ${fixed} ÷ ${cpu} = ${Math.round(be * 10) / 10} units.`,
      "Margin of safety = (volume − break-even volume) ÷ volume: how far sales can fall before the business loses money.",
    ],
  };
}

/** Profit for a grid of prices (down) and volumes (across), around the inputs. */
export function profitGrid(i: ProfitInputs): { prices: number[]; volumes: number[]; values: number[][] } {
  const p0 = n(i.price);
  const v0 = n(i.volume);
  const prices = [-0.1, -0.05, 0, 0.05, 0.1].map((d) => Math.round(p0 * (1 + d) * 100) / 100);
  const volumes = [-0.2, -0.1, 0, 0.1, 0.2].map((d) => Math.round(v0 * (1 + d)));
  return { prices, volumes, values: prices.map((p) => volumes.map((v) => (p - n(i.variableCost)) * v - n(i.fixedCost))) };
}

/* ------------------------------------------------------------------ */
/* Mental math drills                                                  */
/* ------------------------------------------------------------------ */

export interface DrillQuestion {
  id: string;
  kind: string;
  prompt: string;
  answer: number;
  /** The unit shown after the answer box: "", "%" or "$". */
  unit: string;
  /** A hint at the shortcut. */
  tip: string;
}

/** A small seeded generator so a drill can be repeated in tests. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];

export const DRILL_KINDS = ["Percent of", "Growth", "Margin", "Multiply", "Market share", "Doubling time"] as const;

export function drillQuestion(r: () => number, i: number): DrillQuestion {
  const kind = pick(r, [...DRILL_KINDS]);
  const id = `q${i}`;
  switch (kind) {
    case "Percent of": {
      const pct = pick(r, [5, 10, 12.5, 15, 20, 25, 30, 35, 40]);
      const base = pick(r, [80, 120, 160, 240, 360, 480, 640, 800]);
      return { id, kind, prompt: `What is ${pct}% of ${base}?`, answer: (pct * base) / 100, unit: "", tip: "Find 10% first, then scale." };
    }
    case "Growth": {
      const a = pick(r, [80, 120, 150, 200, 250, 400]);
      const g = pick(r, [10, 15, 20, 25, 30, 40]);
      return { id, kind, prompt: `Revenue grew from ${a} to ${a * (1 + g / 100)}. What is the percent growth?`, answer: g, unit: "%", tip: "Change ÷ starting value." };
    }
    case "Margin": {
      const rev = pick(r, [200, 250, 400, 500, 800]);
      const m = pick(r, [8, 10, 12, 15, 20, 25]);
      return { id, kind, prompt: `A company earns ${(rev * m) / 100} of profit on ${rev} of revenue. What is its profit margin?`, answer: m, unit: "%", tip: "Profit ÷ revenue." };
    }
    case "Multiply": {
      const a = pick(r, [12, 15, 18, 24, 25, 35, 45]);
      const b = pick(r, [14, 16, 22, 25, 32, 40]);
      return { id, kind, prompt: `What is ${a} × ${b}?`, answer: a * b, unit: "", tip: "Split one number: 24 × 35 = 24 × 30 + 24 × 5." };
    }
    case "Market share": {
      const mkt = pick(r, [400, 500, 800, 1200, 2000]);
      const s = pick(r, [5, 8, 10, 15, 20, 25]);
      return { id, kind, prompt: `A market is ${mkt} million dollars and a company has ${s}% share. What are its sales, in millions of dollars?`, answer: (mkt * s) / 100, unit: "", tip: "Share × market size." };
    }
    default: {
      const rate = pick(r, [4, 6, 8, 9, 12]);
      return { id, kind, prompt: `About how many years to double an investment at ${rate}% a year? (Use the rule of 72.)`, answer: 72 / rate, unit: "", tip: "72 ÷ the rate." };
    }
  }
}

export function drillSet(seed: number, count = 10): DrillQuestion[] {
  const r = rng(seed);
  return Array.from({ length: count }, (_, i) => drillQuestion(r, i));
}

/** Whether an answer is close enough: within 3% (or 0.15 for small answers), as a mental answer would be. */
export function isClose(guess: number, answer: number): boolean {
  if (!Number.isFinite(guess)) return false;
  return Math.abs(guess - answer) <= Math.max(0.03 * Math.abs(answer), 0.15);
}
