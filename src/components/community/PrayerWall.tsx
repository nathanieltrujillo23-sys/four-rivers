import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import type { Group, GroupPrayer } from "../../types";
import { Button } from "../ui/Button";
import { DropletIcon } from "../ui/RiverIcons";

type Tab = "open" | "answered";

/**
 * The prayer wall: requests shared with the group, newest first. Tap "I prayed" to say you have (tap again to take it
 * back). When a need is met, its author marks it answered and it moves to the Answered tab. Posting without your name
 * keeps the author hidden from everyone, leaders included.
 */
export function PrayerWall({ group, isLeader }: { group: Group; isLeader: boolean }) {
  const { repository } = useCourse();
  const { lang, t } = useLang();
  const dateFmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const [prayers, setPrayers] = useState<GroupPrayer[]>([]);
  const [tab, setTab] = useState<Tab>("open");
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPrayers(await repository.listPrayers(group.id));
    } catch {
      /* the next refresh will try again */
    }
  }, [repository, group.id]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function post(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || posting) return;
    setPosting(true);
    setError(null);
    try {
      await repository.postPrayer(group.id, body, anonymous);
      setText("");
      setAnonymous(false);
      setTab("open");
      await load();
    } catch {
      setError(t("prayer.error"));
    } finally {
      setPosting(false);
    }
  }

  async function pray(p: GroupPrayer) {
    setPrayers((prev) =>
      prev.map((x) =>
        x.id === p.id ? { ...x, prayed: !x.prayed, amenCount: x.amenCount + (x.prayed ? -1 : 1) } : x,
      ),
    );
    try {
      await repository.togglePrayed(p.id);
    } catch {
      void load();
    }
  }

  async function toggleAnswered(p: GroupPrayer) {
    try {
      await repository.setPrayerAnswered(p.id, !p.answeredAt);
      await load();
    } catch {
      setError(t("prayer.error"));
    }
  }

  async function remove(p: GroupPrayer) {
    if (!window.confirm(t("prayer.deleteConfirm"))) return;
    setPrayers((prev) => prev.filter((x) => x.id !== p.id));
    try {
      await repository.deletePrayer(p.id);
    } catch {
      void load();
    }
  }

  const shown = prayers.filter((p) => (tab === "answered" ? !!p.answeredAt : !p.answeredAt));

  const counts = { open: prayers.filter((p) => !p.answeredAt).length, answered: prayers.filter((p) => !!p.answeredAt).length };

  return (
    <section className="cm-card flex flex-col gap-5 p-5 sm:p-6" aria-labelledby={`prayer-${group.id}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`prayer-${group.id}`} className="font-[family-name:var(--font-display)] text-[1.35rem] font-semibold leading-tight text-ink">
            {t("prayer.title")}
          </h2>
          <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("prayer.sub")}</p>
        </div>
        <div className="cm-seg" role="tablist" aria-label={t("prayer.title")}>
          <span aria-hidden="true" className="cm-seg-thumb" style={{ width: "calc(50% - 3px)", transform: tab === "answered" ? "translateX(100%)" : "none" }} />
          {(["open", "answered"] as Tab[]).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
              {t(k === "open" ? "prayer.tab.open" : "prayer.tab.answered")}
              <span className="ml-1.5 tabular-nums text-ink-soft">{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={post} className="cm-inset flex flex-col gap-3 p-3 sm:p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder={t("prayer.placeholder")}
          aria-label={t("prayer.placeholder")}
          className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-[15px] leading-snug text-ink placeholder:text-ink-soft focus:border-water focus:outline-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            {t("prayer.anon")}
          </label>
          <Button type="submit" disabled={!text.trim() || posting}>
            {posting ? t("prayer.posting") : t("prayer.post")}
          </Button>
        </div>
        {error && (
          <p className="font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
            {error}
          </p>
        )}
      </form>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">
          {t(tab === "answered" ? "prayer.emptyAnswered" : "prayer.empty")}
        </p>
      ) : (
        <ul key={tab} className="stagger grid gap-3 sm:grid-cols-2">
          {shown.map((p) => {
            const answered = !!p.answeredAt;
            return (
              <li
                key={p.id}
                className={`cm-lift relative flex flex-col gap-3 overflow-hidden rounded-[0.625rem] border border-line bg-surface p-4 pl-5 ${Date.now() - new Date(p.createdAt).getTime() < 20000 ? "msg-in" : ""}`}
              >
                <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${answered ? "bg-olive" : "bg-water-deep"}`} />
                <p className="whitespace-pre-wrap break-words font-[family-name:var(--font-ui)] text-[15px] leading-relaxed text-ink">{p.body}</p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  <span className="font-medium text-ink">{p.authorName ?? t("prayer.someone")}</span>
                  <span aria-hidden="true">·</span>
                  <span>{dateFmt.format(new Date(p.createdAt))}</span>
                  {answered && <span className="cm-badge border-olive text-olive">{t("prayer.answered")}</span>}
                </p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <button
                    type="button"
                    onClick={() => void pray(p)}
                    aria-pressed={p.prayed}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-[family-name:var(--font-ui)] text-xs font-medium transition-colors active:scale-[0.97] ${
                      p.prayed ? "border-water-deep bg-water-deep text-white" : "border-line text-ink hover:border-water-deep hover:text-water-deep"
                    }`}
                  >
                    <span className={p.prayed ? "bump" : ""}>
                      <DropletIcon color="currentColor" size={14} />
                    </span>
                    {p.prayed ? t("prayer.prayed") : t("prayer.pray")}
                  </button>
                  <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    {p.amenCount > 0 && t(p.amenCount === 1 ? "prayer.countOne" : "prayer.countMany", { n: p.amenCount })}
                  </span>
                </div>
                {(p.mine || isLeader) && (
                  <div className="flex gap-4 font-[family-name:var(--font-ui)] text-xs">
                    <button type="button" onClick={() => void toggleAnswered(p)} className="text-ink-soft underline-offset-2 hover:text-ink hover:underline">
                      {answered ? t("prayer.reopen") : t("prayer.markAnswered")}
                    </button>
                    <button type="button" onClick={() => void remove(p)} className="text-ink-soft underline-offset-2 hover:text-red-700 hover:underline">
                      {t("prayer.delete")}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
