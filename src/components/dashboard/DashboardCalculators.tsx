import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactElement } from "react";
import { useLang } from "../../i18n/LanguageContext";
import type { StringKey } from "../../i18n/en";
import { RIVERS, readable } from "../../theme/theme";
import { useCourse } from "../../state/CourseContext";
import type { CalculatorScenario, CalculatorTool } from "../../types";
import type { ScenarioProps } from "./scenario";
import { Button } from "../ui/Button";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (accent: string, scenario: ScenarioProps<any>) => ReactElement;
}

const TOOLS: Tool[] = [
  {
    id: "budget",
    title: "dash.calc.budget",
    text: "dash.calc.budgetText",
    river: 0,
    Icon: SproutIcon,
    render: (a, p) => <BudgetCalculator accent={a} {...p} />,
  },
  {
    id: "impact",
    title: "dash.calc.impact",
    text: "dash.calc.impactText",
    river: 3,
    Icon: GiftIcon,
    render: (a, p) => <IncomeImpactCalculator accent={a} {...p} />,
  },
  {
    id: "savings",
    title: "dash.calc.savings",
    text: "dash.calc.savingsText",
    river: 1,
    Icon: DropletIcon,
    render: (a, p) => <GrowthCalculator variant="savings" accent={a} {...p} />,
  },
  {
    id: "investing",
    title: "dash.calc.investing",
    text: "dash.calc.investingText",
    river: 2,
    Icon: TreeIcon,
    render: (a, p) => <GrowthCalculator variant="investing" accent={a} {...p} />,
  },
  {
    id: "paths",
    title: "dash.calc.paths",
    text: "dash.calc.pathsText",
    river: 1,
    Icon: DropletIcon,
    render: (a, p) => <MoneyPathsCalculator accent={a} {...p} />,
  },
  {
    id: "tvm",
    title: "dash.calc.tvm",
    text: "dash.calc.tvmText",
    river: 2,
    Icon: TreeIcon,
    render: (a, p) => <TVMExplainer accent={a} {...p} />,
  },
];

/**
 * Every calculator from the course as a compact grid of tiles. Tapping a tile
 * opens that calculator underneath the grid; tapping it again (or Close) puts
 * it away. The calculators are teaching aids and never touch the ledger; a
 * person can save the numbers they typed as a named scenario and bring it back.
 */
export function DashboardCalculators() {
  const { t } = useLang();
  const [openId, setOpenId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = TOOLS.find((x) => x.id === openId) ?? null;
  const { repository } = useCourse();

  // Saved scenarios: the open calculator reports what is typed into it, and a loaded
  // scenario reopens the calculator (a new key remounts it) starting from the saved values.
  const latest = useRef<unknown>(null);
  const onState = useCallback((state: unknown) => {
    latest.current = state;
  }, []);
  const [saved, setSaved] = useState<CalculatorScenario[] | null>(null);
  const [loaded, setLoaded] = useState<{ n: number; data: unknown } | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    repository
      .listScenarios()
      .then((rows) => alive && setSaved(rows))
      .catch(() => alive && setSaved([]));
    return () => {
      alive = false;
    };
  }, [repository]);

  async function save() {
    if (!open || !name.trim() || latest.current == null) return;
    try {
      const row = await repository.saveScenario(open.id as CalculatorTool, name, latest.current);
      setSaved((prev) => [row, ...(prev ?? [])]);
      setName("");
      setMsg({ ok: true, text: t("dash.scn.saved") });
    } catch {
      setMsg({ ok: false, text: t("dash.scn.error") });
    }
  }
  async function remove(id: string) {
    const before = saved;
    setSaved((prev) => (prev ?? []).filter((s) => s.id !== id));
    try {
      await repository.deleteScenario(id);
    } catch {
      setSaved(before);
    }
  }
  const mine = open ? (saved ?? []).filter((s) => s.tool === open.id) : [];

  const toggle = (id: string) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    setMsg(null);
    setLoaded(null);
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
        <h2 id="dash-calc-title" className="t-h2">
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
                  borderTop: `4px solid ${accent}`,
                  boxShadow: active ? `0 0 0 1.5px ${accent}` : undefined,
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
        {open && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface/60 p-3 font-[family-name:var(--font-ui)] text-sm">
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
              >
                <label className="sr-only" htmlFor="scn-name">
                  {t("dash.scn.name")}
                </label>
                <input
                  id="scn-name"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("dash.scn.name")}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-ink focus:border-water focus:outline-none"
                />
                <Button type="submit" variant="secondary" disabled={!name.trim()}>
                  {t("dash.scn.save")}
                </Button>
              </form>
              {msg && (
                <p role="status" className={msg.ok ? "text-olive" : "text-red-700"}>
                  {msg.text}
                </p>
              )}
              {mine.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label={t("dash.scn.list")}>
                  {mine.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center overflow-hidden rounded-full border border-line bg-surface"
                    >
                      <button
                        type="button"
                        onClick={() => setLoaded((l) => ({ n: (l?.n ?? 0) + 1, data: s.data }))}
                        className="px-3 py-1 text-ink hover:bg-parchment-deep"
                      >
                        {s.name}
                      </button>
                      <button
                        type="button"
                        aria-label={t("dash.scn.delete", { name: s.name })}
                        onClick={() => void remove(s.id)}
                        className="border-l border-line px-2 py-1 text-ink-soft hover:bg-parchment-deep hover:text-red-700"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div key={`${open.id}-${loaded?.n ?? 0}`}>
              {open.render(RIVERS[open.river].accent, { initial: loaded?.data, onState })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
