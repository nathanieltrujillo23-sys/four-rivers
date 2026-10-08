import { useEffect, useMemo, useState } from "react";
import type { ScenarioProps } from "../../dashboard/scenario";
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
import { useLang } from "../../../i18n/LanguageContext";
import type { StringKey } from "../../../i18n/en";

type Tab = "streams" | "discretionary" | "debt" | "years";

const TABS: { key: Tab; label: StringKey }[] = [
  { key: "streams", label: "impact.tab.streams" },
  { key: "discretionary", label: "impact.tab.discretionary" },
  { key: "debt", label: "impact.tab.debt" },
  { key: "years", label: "impact.tab.years" },
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
export interface ImpactState {
  rows: StreamRow[];
  expenses: string;
  debts: DebtRow[];
  extraOverride: string | null;
  years: YearsSettings;
}

export function IncomeImpactCalculator({ accent, initial, onState }: { accent: string } & ScenarioProps<ImpactState>) {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("streams");
  const [rows, setRows] = useState<StreamRow[]>(() => initial?.rows ?? [
    newStream(t("impact.ex.dayJob"), "3000"),
    newStream(t("impact.ex.side"), "400"),
  ]);
  const [expenses, setExpenses] = useState(initial?.expenses ?? "2600");
  const [debts, setDebts] = useState<DebtRow[]>(() => initial?.debts ?? [
    newDebt(t("impact.ex.store"), "600", "24", "25"),
    newDebt(t("impact.ex.credit"), "2400", "21", "70"),
    newDebt(t("impact.ex.student"), "6000", "5.5", "90"),
  ]);
  const [extraOverride, setExtraOverride] = useState<string | null>(initial?.extraOverride ?? null);
  const [years, setYears] = useState<YearsSettings>(initial?.years ?? {
    years: 10,
    incomeGrowth: "3",
    expenseGrowth: "0",
    use: "split",
    savingsRate: "1",
    investReturn: "6",
  });

  useEffect(() => onState?.({ rows, expenses, debts, extraOverride, years }), [onState, rows, expenses, debts, extraOverride, years]);

  const main = num(rows[0]?.monthly ?? "");
  const added = rows.slice(1).reduce((sum, r) => sum + num(r.monthly), 0);
  const extraInput = extraOverride ?? String(added);
  const parsedDebts: Debt[] = useMemo(
    () =>
      debts.map((d) => ({
        name: d.name.trim() || t("impact.unnamedDebt"),
        balance: num(d.balance),
        apr: num(d.apr),
        minPayment: num(d.min),
      })),
    [debts, t],
  );

  return (
    <Card accent={accent}>
      <CardBody className="flex flex-col gap-4">
        <div>
          <h3 className="t-h4">
            {t("impact.title")}
          </h3>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {t("impact.intro")}
          </p>
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t("impact.views")}
        >
          {TABS.map((tabItem) => (
            <Button
              key={tabItem.key}
              variant={tab === tabItem.key ? "primary" : "secondary"}
              aria-pressed={tab === tabItem.key}
              onClick={() => setTab(tabItem.key)}
            >
              {t(tabItem.label)}
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
          {t("impact.disclaimer")}
        </p>
      </CardBody>
    </Card>
  );
}
