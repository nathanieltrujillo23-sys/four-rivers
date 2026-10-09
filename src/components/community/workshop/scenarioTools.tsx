import { useState, type ReactNode } from "react";
import { formatCurrency } from "../../../utils/format";
import {
  carPlan,
  compareAccounts,
  housePlan,
  investInYourself,
  monthlyToReachGoal,
  monthsToReachGoal,
  offerValue,
  payoffPlan,
  splitMoney,
  type Debt,
} from "../../../lib/scenarioMath";
import { Button } from "../../ui/Button";

const $ = (n: number) => formatCurrency(n, true);

/** A labelled number box. Empty counts as zero. */
export function Num({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">
      <span>{label}</span>
      <span className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-base text-ink focus-within:border-water">
        {prefix && <span className="text-ink-soft">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? Math.max(0, n) : 0);
          }}
          className="w-full min-w-0 bg-transparent tabular-nums outline-none"
        />
        {suffix && <span className="text-ink-soft">{suffix}</span>}
      </span>
    </label>
  );
}

export function Stat({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${strong ? "bg-water-deep text-white" : "bg-parchment-deep/60 text-ink"}`}>
      <p className={`font-[family-name:var(--font-ui)] text-xs ${strong ? "text-white/80" : "text-ink-soft"}`}>{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {note && <p className={`font-[family-name:var(--font-ui)] text-xs ${strong ? "text-white/80" : "text-ink-soft"}`}>{note}</p>}
    </div>
  );
}

const Grid = ({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) => (
  <div className={`grid gap-3 ${cols === 2 ? "sm:grid-cols-2" : cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3"}`}>{children}</div>
);

const Note = ({ children }: { children: ReactNode }) => (
  <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{children}</p>
);

const months = (n: number | null) => {
  if (n === null) return "never at these payments";
  const y = Math.floor(n / 12);
  const m = n % 12;
  return [y ? `${y} yr` : "", m || !y ? `${m} mo` : ""].filter(Boolean).join(" ");
};

/* ---------------------------------------------------------------- investing, in account types */

export function AccountsTool() {
  const [v, setV] = useState({ cost: 300, years: 30, ret: 7, now: 22, later: 22, gains: 15, match: 0 });
  const set = (k: keyof typeof v) => (n: number) => setV((p) => ({ ...p, [k]: n }));
  const r = compareAccounts({
    monthlyTakeHomeCost: v.cost,
    years: v.years,
    returnPercent: v.ret,
    taxNowPercent: v.now,
    taxLaterPercent: v.later,
    capGainsPercent: v.gains,
    employerMatchMonthly: v.match,
  });
  const rows: { name: string; note: string; row: (typeof r)["roth"] }[] = [
    { name: "Traditional (401k, IRA)", note: "Pre-tax now, taxed when withdrawn", row: r.traditional },
    { name: "Roth (401k, IRA)", note: "Taxed now, tax-free growth and withdrawals", row: r.roth },
    { name: "Regular brokerage account", note: "Taxed now, tax on gains, no limits or age rules", row: r.taxable },
    { name: "HSA (for health costs)", note: "Pre-tax, tax-free growth, tax-free for medical use", row: r.hsa },
  ];
  const best = rows.reduce((a, b) => (b.row.afterTax > a.row.afterTax ? b : a));
  return (
    <div className="flex flex-col gap-4">
      <Grid>
        <Num label="Monthly cost out of your paycheck" prefix="$" value={v.cost} onChange={set("cost")} />
        <Num label="Years invested" value={v.years} onChange={set("years")} />
        <Num label="Yearly return you assume" suffix="%" step={0.5} value={v.ret} onChange={set("ret")} />
        <Num label="Your tax rate now" suffix="%" value={v.now} onChange={set("now")} />
        <Num label="Your tax rate in retirement" suffix="%" value={v.later} onChange={set("later")} />
        <Num label="Tax on investment gains" suffix="%" value={v.gains} onChange={set("gains")} />
        <Num label="Employer match, per month (traditional)" prefix="$" value={v.match} onChange={set("match")} />
      </Grid>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Account comparison table">
        <table className="w-full text-left font-[family-name:var(--font-ui)] text-sm">
          <thead>
            <tr className="text-xs text-ink-soft">
              <th className="py-2 pr-3 font-medium">Account</th>
              <th className="py-2 pr-3 font-medium">Put in</th>
              <th className="py-2 pr-3 font-medium">Grows to</th>
              <th className="py-2 font-medium">Left after tax</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.name} className="border-t border-line align-top">
                <td className="py-2 pr-3">
                  <span className="font-medium text-ink">{x.name}</span>
                  <span className="block text-xs text-ink-soft">{x.note}</span>
                </td>
                <td className="py-2 pr-3 tabular-nums">{$(x.row.contributed)}</td>
                <td className="py-2 pr-3 tabular-nums">{$(x.row.endingBalance)}</td>
                <td className={`py-2 font-semibold tabular-nums ${x === best ? "text-olive" : "text-ink"}`}>{$(x.row.afterTax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        Every account is compared at the same cost to your paycheck. Pre-tax accounts let the same take-home cost put in more. The
        yearly limits, income rules, and withdrawal rules change; check irs.gov or a tax professional. The markets do not return a
        steady rate, so treat the result as a comparison, not a forecast.
      </Note>
    </div>
  );
}

/* ---------------------------------------------------------------- investing in yourself */

export function YourselfTool() {
  const [v, setV] = useState({ cost: 5000, raise: 4000, years: 10 });
  const set = (k: keyof typeof v) => (n: number) => setV((p) => ({ ...p, [k]: n }));
  const r = investInYourself(v.cost, v.raise, v.years);
  return (
    <div className="flex flex-col gap-4">
      <Grid>
        <Num label="Cost of the course, certificate, tools, or degree" prefix="$" value={v.cost} onChange={set("cost")} />
        <Num label="Extra income per year it could bring (after tax)" prefix="$" value={v.raise} onChange={set("raise")} />
        <Num label="Years you would benefit" value={v.years} onChange={set("years")} />
      </Grid>
      <Grid cols={2}>
        <Stat label="Pays itself back in" value={r.paybackMonths === null ? "Not yet" : months(r.paybackMonths)} strong />
        <Stat label={`Net gain after ${v.years} years`} value={$(r.netGain)} note={r.netGain < 0 ? "It would cost more than it earns" : undefined} />
      </Grid>
      <Note>
        Count time as a cost too: hours spent learning are hours not earning. A skill that opens a door, builds a business, or lets
        you serve better can be worth more than the raise alone. These are estimates; nothing guarantees an outcome.
      </Note>
    </div>
  );
}

/* ---------------------------------------------------------------- income */

export function IncomeTool() {
  const [extra, setExtra] = useState({ gross: 500, tax: 22 });
  const [share, setShare] = useState({ Give: 10, Save: 20, Invest: 20, Spend: 50 });
  const net = extra.gross * (1 - Math.min(90, extra.tax) / 100);
  const parts = splitMoney(net, share);
  const total = Object.values(share).reduce((a, b) => a + b, 0);
  const [a, setA] = useState({ salary: 60000, bonus: 0, matchPercent: 4, healthMonthly: 150, commuteMonthly: 80, otherMonthly: 0 });
  const [b, setB] = useState({ salary: 66000, bonus: 2000, matchPercent: 0, healthMonthly: 300, commuteMonthly: 250, otherMonthly: 0 });
  const va = offerValue(a);
  const vb = offerValue(b);
  const offerFields = (o: typeof a, set: (f: typeof a) => void) => (
    <div className="grid grid-cols-2 gap-3">
      <Num label="Salary / yr" prefix="$" value={o.salary} onChange={(n) => set({ ...o, salary: n })} />
      <Num label="Bonus / yr" prefix="$" value={o.bonus} onChange={(n) => set({ ...o, bonus: n })} />
      <Num label="Retirement match" suffix="%" step={0.5} value={o.matchPercent} onChange={(n) => set({ ...o, matchPercent: n })} />
      <Num label="Health cost / mo" prefix="$" value={o.healthMonthly} onChange={(n) => set({ ...o, healthMonthly: n })} />
      <Num label="Commute / mo" prefix="$" value={o.commuteMonthly} onChange={(n) => set({ ...o, commuteMonthly: n })} />
      <Num label="Other costs / mo" prefix="$" value={o.otherMonthly} onChange={(n) => set({ ...o, otherMonthly: n })} />
    </div>
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-ink">Where would more income go?</p>
        <Grid cols={2}>
          <Num label="Extra income per month (before tax)" prefix="$" value={extra.gross} onChange={(n) => setExtra((p) => ({ ...p, gross: n }))} />
          <Num label="Estimated tax on it" suffix="%" value={extra.tax} onChange={(n) => setExtra((p) => ({ ...p, tax: n }))} />
        </Grid>
        <Grid cols={4}>
          {(Object.keys(share) as (keyof typeof share)[]).map((k) => (
            <Num key={k} label={`${k} (share)`} suffix="%" value={share[k]} onChange={(n) => setShare((p) => ({ ...p, [k]: n }))} />
          ))}
        </Grid>
        <Grid cols={4}>
          {Object.entries(parts).map(([k, amount]) => (
            <Stat key={k} label={`${k} each month`} value={$(amount)} note={`${$(amount * 12)} a year`} />
          ))}
        </Grid>
        <Note>
          After tax that is about {$(net)} a month.{total !== 100 ? ` Your shares add up to ${total}%, so they are scaled to 100%.` : ""} Deciding
          the split before the money arrives is what keeps it from disappearing.
        </Note>
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <p className="font-semibold text-ink">Compare two job offers</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-ink">Offer A</p>
            {offerFields(a, setA)}
            <Stat label="Yearly value, before tax" value={$(va)} strong={va >= vb} />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-ink">Offer B</p>
            {offerFields(b, setB)}
            <Stat label="Yearly value, before tax" value={$(vb)} strong={vb > va} />
          </div>
        </div>
        <Note>
          Value is salary plus bonus plus the retirement match, minus the health, commute, and other costs. It leaves out taxes,
          growth, and the things money cannot count: the people, the purpose, and the room to serve.
        </Note>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- getting married */

export function MarriageTool() {
  const [v, setV] = useState({ incA: 2800, incB: 2600, costA: 2100, costB: 2000, together: 3400, debts: 400, wedding: 15000, saved: 3000, months: 12, apr: 4 });
  const set = (k: keyof typeof v) => (n: number) => setV((p) => ({ ...p, [k]: n }));
  const income = v.incA + v.incB;
  const sharing = v.costA + v.costB - v.together;
  const margin = income - v.together - v.debts;
  const need = monthlyToReachGoal(v.wedding, v.saved, v.months, v.apr);
  return (
    <div className="flex flex-col gap-4">
      <Grid>
        <Num label="Your take-home pay / mo" prefix="$" value={v.incA} onChange={set("incA")} />
        <Num label="Their take-home pay / mo" prefix="$" value={v.incB} onChange={set("incB")} />
        <Num label="Your costs now / mo" prefix="$" value={v.costA} onChange={set("costA")} />
        <Num label="Their costs now / mo" prefix="$" value={v.costB} onChange={set("costB")} />
        <Num label="Costs together / mo (rent, food, bills)" prefix="$" value={v.together} onChange={set("together")} />
        <Num label="Debt payments, both of you / mo" prefix="$" value={v.debts} onChange={set("debts")} />
        <Num label="Wedding budget" prefix="$" value={v.wedding} onChange={set("wedding")} />
        <Num label="Saved for it already" prefix="$" value={v.saved} onChange={set("saved")} />
        <Num label="Months until the wedding" value={v.months} onChange={set("months")} />
        <Num label="Savings interest" suffix="%" step={0.5} value={v.apr} onChange={set("apr")} />
      </Grid>
      <Grid>
        <Stat label="Combined income" value={$(income)} note="per month" />
        <Stat label="Left each month after costs and debt" value={$(margin)} note={margin < 0 ? "Costs are higher than income" : "to save, give, and invest"} strong={margin >= 0} />
        <Stat label="Saving on sharing a home" value={$(sharing)} note="per month, compared with living apart" />
        <Stat label="Needed for the wedding" value={$(need)} note={`per month for ${v.months} months`} />
        <Stat
          label="Wedding saving vs. what's left"
          value={margin >= need ? "Fits" : "Does not fit yet"}
          note={margin >= need ? `${$(margin - need)} still left over` : `${$(need - margin)} a month short`}
        />
      </Grid>
      <Note>
        Talk through the hard parts together before the wedding: debts, giving, who handles the bills, and what you each want money
        to do. A wedding costs a day; a marriage costs a lifetime, so many couples set the wedding budget last.
      </Note>
    </div>
  );
}

/* ---------------------------------------------------------------- buying a car */

export function CarTool() {
  const [v, setV] = useState({ price: 22000, down: 3000, tradeIn: 0, salesTaxPercent: 6, aprPercent: 7, months: 60, insuranceMonthly: 130, fuelMonthly: 120, upkeepMonthly: 60, takeHomeMonthly: 3200 });
  const set = (k: keyof typeof v) => (n: number) => setV((p) => ({ ...p, [k]: n }));
  const c = carPlan(v);
  const share = c.shareOfTakeHome;
  return (
    <div className="flex flex-col gap-4">
      <Grid>
        <Num label="Price" prefix="$" value={v.price} onChange={set("price")} />
        <Num label="Down payment" prefix="$" value={v.down} onChange={set("down")} />
        <Num label="Trade-in value" prefix="$" value={v.tradeIn} onChange={set("tradeIn")} />
        <Num label="Sales tax and fees" suffix="%" step={0.5} value={v.salesTaxPercent} onChange={set("salesTaxPercent")} />
        <Num label="Loan interest (APR)" suffix="%" step={0.25} value={v.aprPercent} onChange={set("aprPercent")} />
        <Num label="Loan length" suffix="months" value={v.months} onChange={set("months")} />
        <Num label="Insurance / mo" prefix="$" value={v.insuranceMonthly} onChange={set("insuranceMonthly")} />
        <Num label="Fuel or charging / mo" prefix="$" value={v.fuelMonthly} onChange={set("fuelMonthly")} />
        <Num label="Upkeep and repairs / mo" prefix="$" value={v.upkeepMonthly} onChange={set("upkeepMonthly")} />
        <Num label="Your take-home pay / mo" prefix="$" value={v.takeHomeMonthly} onChange={set("takeHomeMonthly")} />
      </Grid>
      <Grid>
        <Stat label="Loan payment" value={$(c.payment)} note={`on ${$(c.financed)} borrowed`} />
        <Stat label="Interest over the loan" value={$(c.totalInterest)} />
        <Stat label="True monthly cost of the car" value={$(c.monthlyTotal)} note="payment, insurance, fuel, upkeep" strong />
        <Stat label="Share of take-home pay" value={share === null ? "Add your pay" : `${Math.round(share * 100)}%`} note="Many planners suggest keeping all car costs under about 15%" />
      </Grid>
      <Note>
        A car loses value quickly, so a long loan can leave you owing more than the car is worth. Compare the same car with a bigger
        down payment, a shorter loan, or an older model, and shop for the loan before the car.
      </Note>
    </div>
  );
}

/* ---------------------------------------------------------------- buying a house */

export function HouseTool() {
  const [v, setV] = useState({ price: 300000, downPercent: 10, aprPercent: 6.5, years: 30, propertyTaxPercent: 1.1, insuranceYearly: 1800, hoaMonthly: 0, pmiPercent: 0.6, closingPercent: 3 });
  const [income, setIncome] = useState(5500);
  const set = (k: keyof typeof v) => (n: number) => setV((p) => ({ ...p, [k]: n }));
  const h = housePlan(v);
  return (
    <div className="flex flex-col gap-4">
      <Grid>
        <Num label="Home price" prefix="$" value={v.price} onChange={set("price")} />
        <Num label="Down payment" suffix="%" step={0.5} value={v.downPercent} onChange={set("downPercent")} />
        <Num label="Mortgage interest (APR)" suffix="%" step={0.125} value={v.aprPercent} onChange={set("aprPercent")} />
        <Num label="Loan length" suffix="years" value={v.years} onChange={set("years")} />
        <Num label="Property tax, per year" suffix="% of price" step={0.1} value={v.propertyTaxPercent} onChange={set("propertyTaxPercent")} />
        <Num label="Home insurance / yr" prefix="$" value={v.insuranceYearly} onChange={set("insuranceYearly")} />
        <Num label="HOA dues / mo" prefix="$" value={v.hoaMonthly} onChange={set("hoaMonthly")} />
        <Num label="Mortgage insurance (under 20% down)" suffix="% / yr" step={0.1} value={v.pmiPercent} onChange={set("pmiPercent")} />
        <Num label="Closing costs" suffix="% of price" step={0.5} value={v.closingPercent} onChange={set("closingPercent")} />
        <Num label="Your gross income / mo (before tax)" prefix="$" value={income} onChange={setIncome} />
      </Grid>
      <Grid>
        <Stat label="Monthly housing cost" value={$(h.monthlyTotal)} note="loan, tax, insurance, dues" strong />
        <Stat label="Loan payment alone" value={$(h.principalAndInterest)} note={`on ${$(h.loan)}`} />
        <Stat label="Cash needed up front" value={$(h.cashToClose)} note={`${$(h.down)} down plus closing costs`} />
        <Stat label="Income to keep it near 28%" value={`${$(h.grossMonthlyNeeded)} / mo`} note="a common lender rule of thumb, before tax" />
        <Stat
          label="Your housing share of income"
          value={income > 0 ? `${Math.round((h.monthlyTotal / income) * 100)}%` : "Add your income"}
        />
      </Grid>
      <Note>
        Also plan for repairs (many owners set aside 1% of the price a year), moving costs, and keeping an emergency fund after the
        down payment. Rates, taxes, and insurance vary by place, so replace these with real quotes.
      </Note>
    </div>
  );
}

/* ---------------------------------------------------------------- vacation (and any savings goal) */

export function VacationTool() {
  const [v, setV] = useState({ cost: 2400, saved: 300, months: 8, apr: 4, monthly: 250 });
  const set = (k: keyof typeof v) => (n: number) => setV((p) => ({ ...p, [k]: n }));
  const need = monthlyToReachGoal(v.cost, v.saved, v.months, v.apr);
  const wait = monthsToReachGoal(v.cost, v.saved, v.monthly, v.apr);
  return (
    <div className="flex flex-col gap-4">
      <Grid>
        <Num label="What it will cost (trip, gear, a goal)" prefix="$" value={v.cost} onChange={set("cost")} />
        <Num label="Already set aside" prefix="$" value={v.saved} onChange={set("saved")} />
        <Num label="Months until you go" value={v.months} onChange={set("months")} />
        <Num label="Savings interest" suffix="%" step={0.5} value={v.apr} onChange={set("apr")} />
        <Num label="What you can set aside / mo" prefix="$" value={v.monthly} onChange={set("monthly")} />
      </Grid>
      <Grid cols={2}>
        <Stat label={`To be ready in ${v.months} months`} value={`${$(need)} / mo`} strong />
        <Stat label={`Saving ${$(v.monthly)} a month`} value={wait === null ? "Not reached" : wait === 0 ? "Already there" : `Ready in ${months(wait)}`} />
      </Grid>
      <Note>
        Saving for a trip ahead of time means no card balance afterward. The same math works for a gift, a move, or an emergency
        fund. Put the goal in its own account so it is not spent on something else.
      </Note>
    </div>
  );
}

/* ---------------------------------------------------------------- paying off debt */

export function DebtTool() {
  const [debts, setDebts] = useState<Debt[]>([
    { name: "Credit card", balance: 4800, aprPercent: 22, minimum: 120 },
    { name: "Personal loan", balance: 1800, aprPercent: 9, minimum: 70 },
    { name: "Student loan", balance: 12000, aprPercent: 5, minimum: 140 },
  ]);
  const [extra, setExtra] = useState(150);
  const edit = (i: number, patch: Partial<Debt>) => setDebts((d) => d.map((x, j) => (i === j ? { ...x, ...patch } : x)));
  const snow = payoffPlan(debts, extra, "snowball");
  const aval = payoffPlan(debts, extra, "avalanche");
  const saved = snow.totalInterest - aval.totalInterest;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {debts.map((d, i) => (
          <div key={i} className="grid grid-cols-2 items-end gap-3 rounded-xl border border-line p-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
            <label className="col-span-2 flex flex-col gap-1 font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft md:col-span-1">
              <span>Debt</span>
              <input
                value={d.name}
                maxLength={30}
                onChange={(e) => edit(i, { name: e.target.value })}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink focus:border-water focus:outline-none"
              />
            </label>
            <Num label="Balance" prefix="$" value={d.balance} onChange={(n) => edit(i, { balance: n })} />
            <Num label="Interest (APR)" suffix="%" step={0.25} value={d.aprPercent} onChange={(n) => edit(i, { aprPercent: n })} />
            <Num label="Minimum / mo" prefix="$" value={d.minimum} onChange={(n) => edit(i, { minimum: n })} />
            <Button variant="ghost" disabled={debts.length <= 1} onClick={() => setDebts((x) => x.filter((_, j) => j !== i))} aria-label={`Remove ${d.name || "debt"}`}>
              Remove
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap items-end gap-3">
          <Button variant="secondary" disabled={debts.length >= 8} onClick={() => setDebts((d) => [...d, { name: `Debt ${d.length + 1}`, balance: 1000, aprPercent: 10, minimum: 40 }])}>
            Add a debt
          </Button>
          <div className="w-56">
            <Num label="Extra you can pay each month" prefix="$" value={extra} onChange={setExtra} />
          </div>
        </div>
      </div>
      <Grid cols={2}>
        <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
          <p className="font-semibold text-ink">Snowball: smallest balance first</p>
          <Stat label="Debt-free in" value={months(snow.months)} />
          <Stat label="Interest paid" value={$(snow.totalInterest)} />
          <Note>Order: {snow.order.join(", ") || "none"}. Quick wins that keep motivation up.</Note>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
          <p className="font-semibold text-ink">Avalanche: highest interest first</p>
          <Stat label="Debt-free in" value={months(aval.months)} strong />
          <Stat label="Interest paid" value={$(aval.totalInterest)} />
          <Note>Order: {aval.order.join(", ") || "none"}. Costs the least in interest.</Note>
        </div>
      </Grid>
      {aval.months !== null && snow.months !== null && (
        <Note>
          {saved > 1
            ? `The avalanche saves about ${$(saved)} in interest.`
            : "Both ways cost about the same here, so pick the one you will keep doing."}{" "}
          Either beats paying only the minimums. Each paid-off debt's payment rolls into the next one.
        </Note>
      )}
    </div>
  );
}
