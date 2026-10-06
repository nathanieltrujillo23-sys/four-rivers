import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import { RIVERS } from "../../theme/theme";
import type { Group, GroupPrayer } from "../../types";
import { Button } from "../ui/Button";
import { DropletIcon } from "../ui/RiverIcons";

type Tab = "open" | "answered";

/** Paper colors for the notes; the pencil text stays dark on all of them. */
const PAPERS = ["#faf5ec", "#f6ecd2", "#e4eef2", "#ebeee0", "#f3e7da"];

/** A small, steady tilt per card (no randomness, so the wall doesn't shuffle on every render). */
function tilt(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return ((h % 5) - 2) * 0.7;
}

/**
 * The prayer wall: a blackboard with each request pencilled on a paper note
 * and held up by a pin in one of the four river colors. The board grows
 * downward as notes are added. Tap the drop to say you prayed (tap again to
 * take it back). When a need is met, its author marks it answered and the
 * note turns green and moves to the Answered tab. Posting without your name
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

  return (
    <section className="chalkboard" aria-label={t("prayer.title")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="chalk-title text-3xl font-semibold">{t("prayer.title")}</h2>
          <p className="chalk-text font-[family-name:var(--font-ui)] text-sm">{t("prayer.sub")}</p>
        </div>
        <div className="flex gap-2" role="tablist">
          {(["open", "answered"] as Tab[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`chalk-tab ${tab === k ? "chalk-tab-on" : ""}`}
            >
              {t(k === "open" ? "prayer.tab.open" : "prayer.tab.answered")}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={post} className="chalk-form">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder={t("prayer.placeholder")}
          aria-label={t("prayer.placeholder")}
          className="pencil w-full resize-none rounded-md border border-black/10 bg-[#faf5ec] px-3 py-2 text-lg leading-snug placeholder:text-[#8a847a] focus:outline-2 focus:outline-offset-2 focus:outline-[#f2e9d8]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="chalk-text flex cursor-pointer items-center gap-2 font-[family-name:var(--font-ui)] text-sm">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="accent-[#f2e9d8]"
            />
            {t("prayer.anon")}
          </label>
          <Button type="submit" disabled={!text.trim() || posting}>
            {posting ? t("prayer.posting") : t("prayer.post")}
          </Button>
        </div>
        {error && (
          <p className="mt-2 font-[family-name:var(--font-ui)] text-xs text-[#ffb4a8]" role="alert">
            {error}
          </p>
        )}
      </form>

      {shown.length === 0 ? (
        <p className="chalk-text chalk-empty">
          {t(tab === "answered" ? "prayer.emptyAnswered" : "prayer.empty")}
        </p>
      ) : (
        <ul className="grid gap-x-6 gap-y-9 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => {
            const accent = RIVERS[i % RIVERS.length].accent;
            const answered = !!p.answeredAt;
            return (
              <li
                key={p.id}
                className="pencil-note relative p-4 pt-7 transition-transform duration-200 hover:!rotate-0"
                style={{
                  transform: `rotate(${tilt(p.id)}deg)`,
                  backgroundColor: answered ? "#dcecd2" : PAPERS[(i + p.id.length) % PAPERS.length],
                }}
              >
                <span
                  className="pin"
                  style={{ ["--pin" as string]: answered ? "var(--color-olive)" : accent }}
                  aria-hidden="true"
                />

                <p className="pencil whitespace-pre-wrap break-words text-xl leading-snug">{p.body}</p>
                <p className="pencil mt-2 text-base text-[#5c5347]">
                  {p.authorName ?? t("prayer.someone")}
                  {answered && (
                    <span className="ml-2 inline-block -rotate-3 rounded border border-[#4d7a3a] px-1.5 text-sm font-bold uppercase tracking-wide text-[#3f6a2e]">
                      {t("prayer.answered")}
                    </span>
                  )}
                </p>

                <p className="mt-1 font-[family-name:var(--font-ui)] text-[11px] text-[#7a7064]">
                  {dateFmt.format(new Date(p.createdAt))}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => void pray(p)}
                    aria-pressed={p.prayed}
                    className={`group/pray pencil flex items-center gap-2 rounded-full border-2 px-3 py-1 text-base transition-all active:scale-95 ${
                      p.prayed ? "text-white" : "bg-white/50 text-[#3b3a3e] hover:bg-white/80"
                    }`}
                    style={
                      p.prayed
                        ? { backgroundColor: accent, borderColor: accent, color: "#fff" }
                        : { borderColor: accent }
                    }
                  >
                    <span
                      className={
                        p.prayed ? "scale-110" : "transition-transform group-hover/pray:-translate-y-0.5"
                      }
                    >
                      <DropletIcon color={p.prayed ? "#fff" : accent} size={16} />
                    </span>
                    {p.prayed ? t("prayer.prayed") : t("prayer.pray")}
                  </button>
                  <span className="pencil text-base text-[#5a554b]">
                    {p.amenCount > 0 &&
                      t(p.amenCount === 1 ? "prayer.countOne" : "prayer.countMany", { n: p.amenCount })}
                  </span>
                </div>

                {(p.mine || isLeader) && (
                  <div className="pencil mt-2 flex gap-4 border-t border-dashed border-[#2b2b2e]/25 pt-2 text-base">
                    {(p.mine || isLeader) && (
                      <button
                        type="button"
                        onClick={() => void toggleAnswered(p)}
                        className="text-[#3f6a2e] underline-offset-2 hover:underline"
                      >
                        {answered ? t("prayer.reopen") : t("prayer.markAnswered")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void remove(p)}
                      className="text-[#6b665c] underline-offset-2 hover:text-[#9b2c20] hover:underline"
                    >
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
