import { useRef, useState, type ReactElement } from "react";
import { GrowthCalculator } from "../../course/GrowthCalculator";
import { Button } from "../../ui/Button";
import { AccountsTool, BudgetTool, CarTool, DebtTool, HouseTool, IncomeTool, MarriageTool, VacationTool, YourselfTool, type ToolProps } from "./scenarioTools";
import { TOPICS } from "./workshopContent";

interface ToolDef {
  id: string;
  title: string;
  text: string;
  render: (p: ToolProps) => ReactElement;
}

const ACCENT = "#274b6d";

const TOOLS: ToolDef[] = [
  { id: "budget", title: "Budgeting", text: "Plan every dollar of the month: needs, wants, saving, and giving.", render: (p) => <BudgetTool {...p} /> },
  {
    id: "accounts",
    title: "Investing in the markets",
    text: "Compare traditional, Roth, brokerage, and HSA accounts, and watch money grow.",
    render: (p) => (
      <div className="flex flex-col gap-6">
        <AccountsTool {...p} />
        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer font-[family-name:var(--font-ui)] text-sm font-medium text-ink">See the growth over time</summary>
          <div className="mt-3">
            <GrowthCalculator variant="investing" accent={ACCENT} />
          </div>
        </details>
      </div>
    ),
  },
  { id: "yourself", title: "Investing in yourself", text: "What a course, skill, or degree has to earn back.", render: (p) => <YourselfTool {...p} /> },
  { id: "income", title: "Income", text: "Where extra income should go, and how to compare job offers.", render: (p) => <IncomeTool {...p} /> },
  { id: "marriage", title: "Getting married", text: "Two incomes, one home, and a wedding budget.", render: (p) => <MarriageTool {...p} /> },
  { id: "car", title: "Buying a car", text: "The loan, the true monthly cost, and your share of take-home pay.", render: (p) => <CarTool {...p} /> },
  { id: "house", title: "Buying a house", text: "Monthly cost, cash needed up front, and the income it takes.", render: (p) => <HouseTool {...p} /> },
  { id: "vacation", title: "Taking a vacation", text: "Save for a trip, a gift, or an emergency fund by a date.", render: (p) => <VacationTool {...p} /> },
  { id: "debt", title: "Paying off debt", text: "Snowball and avalanche side by side, with your own debts.", render: (p) => <DebtTool {...p} /> },
];

/**
 * The finance tools for the "next steps" of a discovery meeting: budgeting, investing, income, and life events
 * (marriage, a car, a house, a vacation, debt). `recommended` lists the topic ids chosen in the meeting; their tools come first.
 */
export function ScenarioToolkit({
  recommended = [],
  level = 3,
  states,
  onToolState,
  selected,
  onToggle,
  maxSelected = 3,
}: {
  recommended?: string[];
  level?: 3 | 5;
  /** The numbers saved with the meeting for each tool, and where to report changes (a meeting keeps them). */
  states?: Record<string, unknown>;
  onToolState?: (id: string, state: unknown) => void;
  /** The tools picked for the meeting PDF, and the toggle (only inside a meeting). */
  selected?: string[];
  onToggle?: (id: string) => void;
  maxSelected?: number;
}) {
  const Heading = `h${level}` as "h3" | "h5";
  const [openId, setOpenId] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const picked = new Set(recommended.map((id) => TOPICS.find((t) => t.id === id)?.tool).filter(Boolean));
  const sorted = [...TOOLS].sort((a, b) => Number(picked.has(b.id)) - Number(picked.has(a.id)));
  const open = TOOLS.find((t) => t.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((t) => {
          const on = t.id === openId;
          return (
            <li key={t.id} className="flex flex-col gap-1">
              <button
                type="button"
                aria-expanded={on}
                onClick={() => {
                  setOpenId(on ? null : t.id);
                  if (!on) window.setTimeout(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
                }}
                className={`flex h-full w-full flex-col gap-1 rounded-xl border p-3 text-left ${
                  on ? "border-water-deep bg-parchment-deep" : "border-line bg-surface hover:bg-parchment-deep/50"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{t.title}</span>
                  {picked.has(t.id) && (
                    <span className="rounded-full bg-gold/25 px-2 py-0.5 font-[family-name:var(--font-ui)] text-[11px] font-medium text-ink">Chosen topic</span>
                  )}
                </span>
                <span className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t.text}</span>
              </button>
              {onToggle && (
                <label className="flex cursor-pointer items-center gap-2 px-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={selected?.includes(t.id) ?? false}
                    disabled={!(selected?.includes(t.id) ?? false) && (selected?.length ?? 0) >= maxSelected}
                    onChange={() => onToggle(t.id)}
                    className="h-4 w-4 accent-[var(--color-water-deep)]"
                  />
                  <span>
                    Include {t.title} in the PDF
                  </span>
                </label>
              )}
            </li>
          );
        })}
      </ul>
      <div ref={panel}>
        {open && (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <Heading className="t-h4">{open.title}</Heading>
              <Button variant="ghost" onClick={() => setOpenId(null)}>
                Close
              </Button>
            </div>
            {open.render({ initial: states?.[open.id], onState: onToolState ? (st) => onToolState(open.id, st) : undefined })}
          </div>
        )}
      </div>
      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        These tools are for learning and planning. They use the numbers you type, make simple assumptions, and are not financial, tax,
        legal, or investment advice.
      </p>
    </div>
  );
}
