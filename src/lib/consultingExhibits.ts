/**
 * Exhibit drills: a chart or table from an invented case, two numbers to pull from it, and the one-sentence takeaway.
 * In a case interview an exhibit gets about a minute, and the point is the "so what", not a description of the chart.
 * Every answer is worked out from the exhibit's own data, so the drill cannot disagree with its chart.
 */

export interface ExhibitSeries {
  name: string;
  values: number[];
}
export interface ExhibitQuestion {
  id: string;
  prompt: string;
  unit: string;
  /** The answer, from the data. */
  answer: number;
  /** How far off an answer can be: a fraction of the answer, or an absolute amount for percents. */
  tolerance: { kind: "relative" | "absolute"; by: number };
  how: string;
}
/** What it takes to draw an exhibit. */
export interface ExhibitData {
  /** A plain title, the way an interviewer hands it over: it names the data, not the conclusion. */
  title: string;
  kind: "bars" | "lines" | "table";
  labels: string[];
  series: ExhibitSeries[];
  /** The unit of the values, for the axis and table. */
  unit: string;
}
export interface Exhibit extends ExhibitData {
  id: string;
  context: string;
  questions: ExhibitQuestion[];
  takeaways: string[];
  /** Which takeaway is the "so what". */
  best: number;
  why: string;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const r1 = (x: number) => Math.round(x * 10) / 10;
const rel = (by = 0.03) => ({ kind: "relative" as const, by });
const pts = (by = 1) => ({ kind: "absolute" as const, by });

function build(): Exhibit[] {
  // 1. Revenue by segment, two years.
  const seg = { labels: ["Enterprise", "Mid-market", "Small business", "Consumer"], y1: [120, 90, 60, 30], y2: [126, 99, 105, 30] };
  const t1 = sum(seg.y1);
  const t2 = sum(seg.y2);
  const growth = seg.y2.map((v, i) => v - seg.y1[i]);

  // 2. Price and volume over three years.
  const pv = { years: ["2023", "2024", "2025"], price: [20, 22, 25], units: [500, 440, 380] };
  const rev = pv.price.map((p, i) => p * pv.units[i]);

  // 3. Market size and the client's sales.
  const mk = { years: ["2021", "2022", "2023", "2024", "2025"], market: [800, 880, 970, 1070, 1180], client: [240, 250, 258, 262, 265], entrant: [0, 20, 60, 120, 190] };
  const share = mk.client.map((c, i) => (c / mk.market[i]) * 100);

  // 4. Revenue and margin by channel.
  const ch = { labels: ["Retail stores", "Wholesale", "Online", "Marketplace"], revenue: [400, 250, 200, 150], margin: [6, 14, 22, 10] };
  const profit = ch.revenue.map((v, i) => (v * ch.margin[i]) / 100);

  // 5. Profit bridge.
  const br = { labels: ["Profit 2024", "Price", "Volume", "Input costs", "Overhead", "Profit 2025"], steps: [50, 12, -8, -15, -4] };
  const endProfit = sum(br.steps);

  // 6. Plant utilization.
  const pl = { labels: ["Plant A", "Plant B", "Plant C", "Plant D"], capacity: [100, 80, 120, 60], output: [92, 70, 66, 54] };
  const util = pl.output.map((o, i) => (o / pl.capacity[i]) * 100);

  return [
    {
      id: "segments",
      title: "Revenue by customer segment, 2023 and 2025 ($ millions)",
      context: "A software company says it is growing well and wants to know where to invest sales effort.",
      kind: "bars",
      labels: seg.labels,
      series: [{ name: "2023", values: seg.y1 }, { name: "2025", values: seg.y2 }],
      unit: "$M",
      questions: [
        { id: "growth", prompt: "By what percent did total revenue grow from 2023 to 2025?", unit: "%", answer: r1((t2 / t1 - 1) * 100), tolerance: pts(1), how: `Total revenue went from $${t1}M to $${t2}M: ${t2} ÷ ${t1} − 1 = ${r1((t2 / t1 - 1) * 100)}%.` },
        { id: "share", prompt: "What share of the growth in dollars came from Small business?", unit: "%", answer: r1((growth[2] / (t2 - t1)) * 100), tolerance: pts(2), how: `Growth was $${t2 - t1}M in total; Small business added $${growth[2]}M: ${growth[2]} ÷ ${t2 - t1} = ${r1((growth[2] / (t2 - t1)) * 100)}%.` },
      ],
      takeaways: [
        "Revenue grew in three of the four segments.",
        "Enterprise is still the largest segment, so sales effort should stay there.",
        "Three quarters of the growth came from Small business; the other segments are nearly flat.",
        "Consumer revenue did not change between 2023 and 2025.",
      ],
      best: 2,
      why: "The first and last statements are true but only describe the chart. The second draws a conclusion the data does not support: the largest segment is barely growing. The so-what is where the growth is coming from.",
    },
    {
      id: "price-volume",
      title: "Average price and units sold, 2023 to 2025",
      context: "A consumer products maker raised prices twice and is puzzled that results have not improved.",
      kind: "table",
      labels: pv.years,
      series: [{ name: "Average price ($)", values: pv.price }, { name: "Units sold (thousands)", values: pv.units }],
      unit: "",
      questions: [
        { id: "rev", prompt: "What was revenue in 2025, in $ thousands?", unit: "$K", answer: rev[2], tolerance: rel(0.02), how: `Revenue = price × units = $${pv.price[2]} × ${pv.units[2]} thousand = $${rev[2].toLocaleString("en-US")} thousand.` },
        { id: "change", prompt: "By what percent did revenue change from 2023 to 2025?", unit: "%", answer: r1((rev[2] / rev[0] - 1) * 100), tolerance: pts(1), how: `Revenue went from $${rev[0].toLocaleString("en-US")}K to $${rev[2].toLocaleString("en-US")}K: ${r1((rev[2] / rev[0] - 1) * 100)}%.` },
      ],
      takeaways: [
        "Price rose 25% while units fell 24%, so revenue fell: customers are more price-sensitive than the company assumed.",
        "The company raised its price by $5 over two years.",
        "Units sold fell every year.",
        "Higher prices increased revenue per unit, which is good for margins.",
      ],
      best: 0,
      why: "The table has to be multiplied before it says anything. Price up 25% and units down 24% leaves revenue down 5%: the price increases cost more volume than they earned. The last statement may be true per unit but misses that the total fell.",
    },
    {
      id: "share",
      title: "Market size, the client's sales and a new entrant's sales, 2021 to 2025 ($ millions)",
      context: "A market leader's sales have grown every year and management is satisfied.",
      kind: "lines",
      labels: mk.years,
      series: [{ name: "Total market", values: mk.market }, { name: "Client", values: mk.client }, { name: "New entrant", values: mk.entrant }],
      unit: "$M",
      questions: [
        { id: "share25", prompt: "What was the client's market share in 2025?", unit: "%", answer: r1(share[4]), tolerance: pts(1), how: `$${mk.client[4]}M ÷ $${mk.market[4]}M = ${r1(share[4])}%.` },
        { id: "lost", prompt: "How many points of share has the client lost since 2021?", unit: "pts", answer: r1(share[0] - share[4]), tolerance: pts(1), how: `Share was ${r1(share[0])}% in 2021 and ${r1(share[4])}% in 2025: a loss of ${r1(share[0] - share[4])} points.` },
      ],
      takeaways: [
        "The client's sales grew every year from 2021 to 2025.",
        "The market grew by almost half in four years.",
        "The client is growing far slower than its market and has lost about 8 points of share, much of it to the new entrant.",
        "The new entrant is still smaller than the client.",
      ],
      best: 2,
      why: "Sales growth looks fine until it is compared with the market: the market grew about 48% and the client about 10%. Rising sales are hiding a falling share.",
    },
    {
      id: "channels",
      title: "Revenue and profit margin by sales channel ($ millions and percent)",
      context: "A retailer plans to put next year's investment into its largest channel.",
      kind: "table",
      labels: ch.labels,
      series: [{ name: "Revenue ($M)", values: ch.revenue }, { name: "Profit margin (%)", values: ch.margin }],
      unit: "",
      questions: [
        { id: "online", prompt: "How much profit does Online earn, in $ millions?", unit: "$M", answer: profit[2], tolerance: rel(0.03), how: `$${ch.revenue[2]}M × ${ch.margin[2]}% = $${profit[2]}M.` },
        { id: "total", prompt: "What is total profit across all four channels, in $ millions?", unit: "$M", answer: sum(profit), tolerance: rel(0.03), how: `${profit.map((p) => `$${p}M`).join(" + ")} = $${sum(profit)}M.` },
      ],
      takeaways: [
        "Retail stores bring in the most revenue.",
        "Online has the highest margin of the four channels.",
        "Margins range from 6% to 22% across channels.",
        "Online earns the most profit on half the revenue of Retail stores, so the largest channel is not the one to invest in.",
      ],
      best: 3,
      why: "Revenue and margin have to be combined: Retail stores earn $24M on $400M, Online $44M on $200M. The plan to invest in the largest channel puts money where it earns least.",
    },
    {
      id: "bridge",
      title: "What changed profit from 2024 to 2025 ($ millions)",
      context: "A manufacturer raised prices this year and expected profit to rise with them.",
      kind: "bars",
      labels: br.labels,
      series: [{ name: "Amount", values: [...br.steps, endProfit] }],
      unit: "$M",
      questions: [
        { id: "end", prompt: "What was profit in 2025, in $ millions?", unit: "$M", answer: endProfit, tolerance: rel(0.03), how: `${br.steps[0]} + ${br.steps[1]} − ${-br.steps[2]} − ${-br.steps[3]} − ${-br.steps[4]} = $${endProfit}M.` },
        { id: "pct", prompt: "By what percent did profit change?", unit: "%", answer: r1((endProfit / br.steps[0] - 1) * 100), tolerance: pts(1), how: `$${br.steps[0]}M to $${endProfit}M: ${r1((endProfit / br.steps[0] - 1) * 100)}%.` },
      ],
      takeaways: [
        "Price added $12 million to profit.",
        "Profit fell 30% even though price added $12 million: higher input costs and lost volume took back nearly twice that.",
        "Overhead rose by $4 million.",
        "Four things changed profit between the two years.",
      ],
      best: 1,
      why: "A bridge is read as a net: the price gain is real, but costs and volume together took away $27M. The so-what names both the result and its main cause.",
    },
    {
      id: "plants",
      title: "Capacity and output by plant (thousand units a year)",
      context: "A company is short of product and is about to approve a fifth plant.",
      kind: "bars",
      labels: pl.labels,
      series: [{ name: "Capacity", values: pl.capacity }, { name: "Output", values: pl.output }],
      unit: "K units",
      questions: [
        { id: "c", prompt: "What is Plant C's utilization?", unit: "%", answer: r1(util[2]), tolerance: pts(1), how: `${pl.output[2]} ÷ ${pl.capacity[2]} = ${r1(util[2])}%.` },
        { id: "spare", prompt: "How many thousand units of capacity are unused across all four plants?", unit: "K", answer: sum(pl.capacity) - sum(pl.output), tolerance: rel(0.03), how: `Capacity ${sum(pl.capacity)} − output ${sum(pl.output)} = ${sum(pl.capacity) - sum(pl.output)} thousand units.` },
      ],
      takeaways: [
        "Plant C is the largest plant.",
        "Three of the four plants run at about 90% of capacity.",
        "Total output is 282 thousand units a year.",
        "Plant C runs at only 55% and has 54 thousand units to spare: fixing it comes before building a fifth plant.",
      ],
      best: 3,
      why: "The other three plants are full, which is why the company feels short. But most of the unused capacity sits in one plant. The so-what answers the decision on the table: a new plant is not the first move.",
    },
  ];
}

export const EXHIBITS: Exhibit[] = build();

export function checkAnswer(q: ExhibitQuestion, guess: number): boolean {
  if (!Number.isFinite(guess)) return false;
  return q.tolerance.kind === "relative" ? Math.abs(guess - q.answer) <= Math.abs(q.answer) * q.tolerance.by : Math.abs(guess - q.answer) <= q.tolerance.by;
}

export interface ExhibitRun {
  date: string;
  exhibit: string;
  /** Out of three: two numbers and the takeaway. */
  correct: number;
  seconds: number;
}

/** How many of the three parts are right. */
export function scoreExhibit(e: Exhibit, numbers: Record<string, string>, takeaway: number | null): number {
  return e.questions.filter((q) => checkAnswer(q, parseFloat(numbers[q.id] ?? ""))).length + (takeaway === e.best ? 1 : 0);
}
