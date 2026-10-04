import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import { RIVERS } from "../../theme/theme";
import type { Group, GroupPrayer } from "../../types";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { DropletIcon, SproutIcon } from "../ui/RiverIcons";

type Tab = "open" | "answered";

/** A small, steady tilt per card (no randomness, so the wall doesn't shuffle on every render). */
function tilt(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return ((h % 5) - 2) * 0.7;
}

/**
 * The prayer wall: notes pinned to a board, each in one of the four river
 * colors. Tap the drop to say you prayed (tap again to take it back). When a
 * need is met, its author marks it answered and the note turns green and
 * moves to the Answered tab. Posting without your name keeps the author
 * hidden from everyone, leaders included.
 */
export function PrayerWall({ group, isLeader }: { group: Group; isLeader: boolean }) {
  const { repository } = useCourse();
  const { t } = useLang();
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
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">{t("prayer.title")}</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("prayer.sub")}</p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-line" role="tablist">
          {(["open", "answered"] as Tab[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`px-3 py-1.5 font-[family-name:var(--font-ui)] text-sm transition-colors ${
                tab === k ? "bg-water-deep text-white" : "bg-surface text-ink-soft hover:bg-parchment-deep"
              }`}
            >
              {t(k === "open" ? "prayer.tab.open" : "prayer.tab.answered")}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={post} className="rounded-2xl border border-dashed border-line bg-parchment-deep/30 p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder={t("prayer.placeholder")}
          aria-label={t("prayer.placeholder")}
          className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-base text-ink focus:border-water focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="accent-[var(--color-water-deep)]"
            />
            {t("prayer.anon")}
          </label>
          <Button type="submit" disabled={!text.trim() || posting}>
            {posting ? t("prayer.posting") : t("prayer.post")}
          </Button>
        </div>
        {error && (
          <p className="mt-2 font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
            {error}
          </p>
        )}
      </form>

      {shown.length === 0 ? (
        <Card>
          <CardBody className="text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {t(tab === "answered" ? "prayer.emptyAnswered" : "prayer.empty")}
          </CardBody>
        </Card>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => {
            const accent = RIVERS[i % RIVERS.length].accent;
            const answered = !!p.answeredAt;
            return (
              <li
                key={p.id}
                className="relative rounded-2xl border border-line bg-surface p-4 pt-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:!rotate-0"
                style={{
                  transform: `rotate(${tilt(p.id)}deg)`,
                  borderTop: `5px solid ${answered ? "var(--color-olive)" : accent}`,
                  boxShadow: answered
                    ? "0 0 0 3px color-mix(in srgb, var(--color-olive) 18%, transparent)"
                    : undefined,
                }}
              >
                <span
                  className="absolute -top-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-surface shadow"
                  aria-hidden="true"
                >
                  {answered ? (
                    <SproutIcon color="var(--color-olive)" size={16} />
                  ) : (
                    <DropletIcon color={accent} size={14} />
                  )}
                </span>

                <p className="whitespace-pre-wrap break-words text-ink">{p.body}</p>
                <p className="mt-2 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  {p.authorName ?? t("prayer.someone")}
                  {answered && (
                    <span className="ml-2 font-semibold text-olive">· {t("prayer.answered")}</span>
                  )}
                </p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => void pray(p)}
                    aria-pressed={p.prayed}
                    className={`group/pray flex items-center gap-2 rounded-full border px-3 py-1.5 font-[family-name:var(--font-ui)] text-sm transition-all active:scale-95 ${
                      p.prayed ? "text-white" : "bg-surface text-ink-soft hover:bg-parchment-deep"
                    }`}
                    style={
                      p.prayed ? { backgroundColor: accent, borderColor: accent } : { borderColor: accent }
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
                  <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                    {p.amenCount > 0 &&
                      t(p.amenCount === 1 ? "prayer.countOne" : "prayer.countMany", { n: p.amenCount })}
                  </span>
                </div>

                {(p.mine || isLeader) && (
                  <div className="mt-2 flex gap-3 border-t border-line pt-2 font-[family-name:var(--font-ui)] text-xs">
                    {p.mine && (
                      <button
                        type="button"
                        onClick={() => void toggleAnswered(p)}
                        className="text-olive hover:underline"
                      >
                        {answered ? t("prayer.reopen") : t("prayer.markAnswered")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void remove(p)}
                      className="text-ink-soft hover:text-red-700"
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
