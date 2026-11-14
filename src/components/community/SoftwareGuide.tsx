import { ACCESS_LABEL, softwareFor, type SoftwareAccess } from "../../lib/industrySoftware";
import type { DailyBreadTool } from "../../lib/dailyBread";
import { Panel } from "../wealth/parts";

const TONE: Record<SoftwareAccess, string> = {
  uf: "border-river-1 text-river-1",
  public: "border-water-deep text-water-deep",
  varies: "border-line text-ink-soft",
  none: "border-line text-ink-soft",
};

/** What the industry runs on for one track: what each product is for, how to practice the same idea here, and how to get access. */
export function SoftwareGuide({ track }: { track: DailyBreadTool }) {
  const list = softwareFor(track);
  return (
    <Panel title="Industry software" subtitle="What firms in this field actually use, so you can speak to it, and where the same idea lives in these tools.">
      <ul className="grid gap-4 md:grid-cols-2">
        {list.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="t-h4">{s.name}</h4>
                <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{s.kind}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-ui)] text-[11px] font-medium ${TONE[s.access]}`}>{ACCESS_LABEL[s.access]}</span>
            </div>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink">{s.use}</p>
            <p className="font-[family-name:var(--font-ui)] text-sm text-ink">
              <span className="font-semibold">Practice it here: </span>
              {s.here}
            </p>
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{s.accessNote}</p>
          </li>
        ))}
      </ul>
      <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        Product names belong to their owners. 4 Rivers is not affiliated with or endorsed by any of them, and does not copy their data: enter figures yourself and name your source.
      </p>
    </Panel>
  );
}
