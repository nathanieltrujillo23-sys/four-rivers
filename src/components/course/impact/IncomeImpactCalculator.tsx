import { useMemo, useState } from "react";
import type { Debt } from "../../../utils/debtSnowball";
import { Card, CardBody } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { StreamsPanel } from "./StreamsPanel";
import { DiscretionaryPanel } from "./DiscretionaryPanel";
import { DebtPanel } from "./DebtPanel";
import { YearsPanel, type YearsSettings } from "./YearsPanel";
import {
  newDebt,
  newStream,
  num,
  type DebtRow,
  type StreamRow,
} from "./shared";

type Tab = "streams" | "discretionary" | "debt" | "years";

const TABS: { key: Tab; label: string }[] = [
  { key: "streams", label: "Your streams" },
  { key: "discretionary", label: "Discretionary money" },
  { key: "debt", label: "Debt snowball" },
  { key: "years", label: "Year by year" },
];

/**
 * River 1's practice calculator, all in one place: sketch income streams,
 * see how added streams change the money left after (unchanged) expenses,
 * try a debt snowball, and look years ahead at income, discretionary money,
 * debt paid, and money saved or invested. One set of numbers feeds every
 * view, and each button swaps in just that view's inputs and graphics.
 * Purely a hypothetical teaching aid — no server state, nothing logged, and
 * no suggestion of what a household should do with its money.
 */
export function IncomeImpactCalculator({ accent }: { accent: string }) {
  const [tab, setTab] = useState<Tab>("streams");
  const [rows, setRows] = useState<StreamRow[]>(() => [
    newStream("Day job", "3000"),
    newStream("Side hustle", "400"),
  ]);
  const [expenses, setExpenses] = useState("2600");
  const [debts, setDebts] = useState<DebtRow[]>(() => [
    newDebt("Store card", "600", "24", "25"),
    newDebt("Credit card", "2400", "21", "70"),
    newDebt("Student loan", "6000", "5.5", "90"),
  ]);
  const [extraOverride, setExtraOverride] = useState<string | null>(null);
  const [years, setYears] = useState<YearsSettings>({
    years: 10,
    incomeGrowth: "3",
    expenseGrowth: "0",
    use: "split",
    savingsRate: "1",
    investReturn: "6",
  });

  const main = num(rows[0]?.monthly ?? "");
  const added = rows.slice(1).reduce((sum, r) => sum + num(r.monthly), 0);
  const extraInput = extraOverride ?? String(added);
  const parsedDebts: Debt[] = useMemo(
    () =>
      debts.map((d) => ({
        name: d.name.trim() || "Unnamed debt",
        balance: num(d.balance),
        apr: num(d.apr),
        minPayment: num(d.min),
      })),
    [debts],
  );

  return (
    <Card accent={accent}>
      <CardBody className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">
            What could another stream change?
          </h3>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            Everything here runs on the same set of numbers. Each button shows a
            different side of it. These are example figures for exploring, not
            predictions or advice.
          </p>
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Calculator views"
        >
          {TABS.map((t) => (
            <Button
              key={t.key}
              variant={tab === t.key ? "primary" : "secondary"}
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {tab === "streams" && (
          <StreamsPanel rows={rows} setRows={setRows} accent={accent} />
        )}
        {tab === "discretionary" && (
          <DiscretionaryPanel
            main={main}
            added={added}
            expenses={expenses}
            setExpenses={setExpenses}
            accent={accent}
          />
        )}
        {tab === "debt" && (
          <DebtPanel
            debts={debts}
            setDebts={setDebts}
            extra={num(extraInput)}
            extraInput={extraInput}
            setExtraInput={setExtraOverride}
            addedMonthly={added}
            accent={accent}
          />
        )}
        {tab === "years" && (
          <YearsPanel
            settings={years}
            setSettings={(patch) => setYears((prev) => ({ ...prev, ...patch }))}
            main={main}
            added={added}
            expenses={num(expenses)}
            debts={parsedDebts}
            accent={accent}
          />
        )}

        <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
          Everything here is hypothetical. Real results vary, investments can
          lose value, and where extra money should go (debt, savings, investing,
          giving, or somewhere else) is a decision for you and the people you
          trust.
        </p>
      </CardBody>
    </Card>
  );
}
