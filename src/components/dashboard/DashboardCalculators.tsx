import { useRef, useState, type ComponentType, type ReactElement } from "react";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { RIVERS, readable } from "../../theme/theme";
import { DropletIcon, GiftIcon, SproutIcon, TreeIcon } from "../ui/RiverIcons";
import { BudgetCalculator } from "../course/tools/BudgetCalculator";
import { MoneyPathsCalculator } from "../course/tools/MoneyPathsCalculator";
import { IncomeImpactCalculator } from "../course/impact/IncomeImpactCalculator";
import { GrowthCalculator } from "../course/GrowthCalculator";
import { TVMExplainer } from "../course/TVMExplainer";

type Icon = ComponentType<{ color: string; size?: number }>;

interface Tool {
  id: string;
  title: StringKey;
  text: StringKey;
  river: 0 | 1 | 2 | 3;
  Icon: Icon;
  render: (accent: string) => ReactElement;
}

const TOOLS: Tool[] = [
  {
    id: "budget",
    title: "dash.calc.budget",
    text: "dash.calc.budgetText",
    river: 0,
    Icon: SproutIcon,
    render: (a) => <BudgetCalculator accent={a} />,
  },
  {
    id: "impact",
    title: "dash.calc.impact",
    text: "dash.calc.impactText",
    river: 3,
    Icon: GiftIcon,
    render: (a) => <IncomeImpactCalculator accent={a} />,
  },
  {
    id: "savings",
    title: "dash.calc.savings",
    text: "dash.calc.savingsText",
    river: 1,
    Icon: DropletIcon,
    render: (a) => <GrowthCalculator variant="savings" accent={a} />,
  },
  {
    id: "investing",
    title: "dash.calc.investing",
    text: "dash.calc.investingText",
    river: 2,
    Icon: TreeIcon,
    render: (a) => <GrowthCalculator variant="investing" accent={a} />,
  },
  {
    id: "paths",
    title: "dash.calc.paths",
    text: "dash.calc.pathsText",
    river: 1,
    Icon: DropletIcon,
    render: (a) => <MoneyPathsCalculator accent={a} />,
  },
  {
    id: "tvm",
    title: "dash.calc.tvm",
    text: "dash.calc.tvmText",
    river: 2,
    Icon: TreeIcon,
    render: (a) => <TVMExplainer accent={a} />,
  },
];

/**
 * Every calculator from the course as a compact grid of tiles. Tapping a tile
 * opens that calculator underneath the grid; tapping it again (or Close) puts
 * it away. These are teaching aids with no saved state, so nothing here
 * touches the ledger.
 */
export function DashboardCalculators() {
  const { t } = useLang();
  const [openId, setOpenId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = TOOLS.find((x) => x.id === openId) ?? null;

  const toggle = (id: string) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next)
      setTimeout(
        () =>
          panelRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          }),
        50,
      );
  };

  return (
    <section data-tour="dash-calculators" className="flex flex-col gap-4" aria-labelledby="dash-calc-title">
      <div>
        <h2 id="dash-calc-title" className="text-2xl font-semibold text-ink">
          {t("dash.calc.title")}
        </h2>
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {t("dash.calc.text")}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const accent = RIVERS[tool.river].accent;
          const active = tool.id === openId;
          return (
            <li key={tool.id}>
              <button
                type="button"
                aria-expanded={active}
                aria-controls="dash-calc-panel"
                onClick={() => toggle(tool.id)}
                className={`flex h-full w-full flex-col gap-2 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  active
                    ? "bg-surface shadow-md"
                    : "border-line bg-surface/70 shadow-sm"
                }`}
                style={{
                  borderColor: active ? accent : undefined,
                  borderTop: `4px solid ${accent}`,
                }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: RIVERS[tool.river].accentSoft }}
                  >
                    <tool.Icon color={readable(accent)} size={22} />
                  </span>
                  <span className="font-semibold leading-tight text-ink">
                    {t(tool.title)}
                  </span>
                </span>
                <span className="font-[family-name:var(--font-ui)] text-xs leading-snug text-ink-soft">
                  {t(tool.text)}
                </span>
                <span
                  className="mt-auto pt-1 font-[family-name:var(--font-ui)] text-xs font-semibold"
                  style={{ color: readable(accent) }}
                >
                  {active ? t("dash.calc.close") : t("dash.calc.open")}{" "}
                  {active ? "×" : "→"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div id="dash-calc-panel" ref={panelRef}>
        {open && open.render(RIVERS[open.river].accent)}
      </div>
    </section>
  );
}
