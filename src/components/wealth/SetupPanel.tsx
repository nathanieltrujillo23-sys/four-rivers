import { Panel } from "./parts";
import type { ModuleProps } from "./PlanModules";
import { ALL_MODULES, CLIENT_TYPES, MODULES, PLANNING_MODULES, moduleOn, type ClientTypeId } from "../../lib/wealthSetup";

/** Plan setup: the kind of client, and which parts of the workbench and the deck are on for this person. */
export function SetupPanel({ plan, set }: ModuleProps) {
  const setup = plan.setup;
  const type = CLIENT_TYPES.find((t) => t.id === setup.type) ?? CLIENT_TYPES[0];
  const toggle = (id: string, on: boolean) => set({ ...plan, setup: { ...setup, modules: { ...setup.modules, [id]: on } } });
  const customized = ALL_MODULES.filter((m) => setup.modules[m.id] !== undefined).length;
  const row = (m: (typeof ALL_MODULES)[number]) => (
    <label key={m.id} className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
      <input type="checkbox" checked={moduleOn(setup, m.id)} onChange={(e) => toggle(m.id, e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]" />
      <span>
        {m.label}
        <span className="block text-xs text-ink-soft">{m.text}</span>
      </span>
    </label>
  );
  return (
    <Panel
      title="Tailor this plan"
      subtitle="Choose the kind of client for sensible starting choices, then switch any part on or off. Parts that are off disappear from the steps and from the presentation."
    >
      <div role="group" aria-label="Kind of client" className="flex flex-wrap gap-2">
        {CLIENT_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={setup.type === t.id}
            onClick={() => set({ ...plan, setup: { type: t.id as ClientTypeId, modules: {} } })}
            className={`rounded-full border px-3 py-1 font-[family-name:var(--font-ui)] text-xs transition-colors ${
              setup.type === t.id ? "border-water-deep bg-water-deep text-white" : "border-line text-ink-soft hover:bg-parchment-deep hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        {type.text} Picking a kind of client resets your on/off choices{customized > 0 ? ` (${customized} changed from the starting choices now)` : ""}.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-ink-soft">Workbench</legend>
          {MODULES.map(row)}
        </fieldset>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-ink-soft">Planning depth</legend>
          {PLANNING_MODULES.map(row)}
        </fieldset>
      </div>
    </Panel>
  );
}
