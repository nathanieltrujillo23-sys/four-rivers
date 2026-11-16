import { useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { useAuth } from "../../state/AuthContext";
import { useLang } from "../../i18n/LanguageContext";
import { downloadFile } from "../../lib/ics";
import { Button } from "../ui/Button";

/**
 * Your data (Update 42), at the foot of Edit profile: download everything 4 Rivers holds for you as one file, or
 * delete the account. Deleting asks you to type DELETE, says exactly what goes, and is refused by the server for admin
 * accounts and for anyone still leading a group with other members.
 */
export function YourData({ onDeleted }: { onDeleted: () => void }) {
  const { repository, snapshot } = useCourse();
  const { signOut } = useAuth();
  const { t } = useLang();
  const [exporting, setExporting] = useState(false);
  const [asking, setAsking] = useState(false);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = snapshot?.profile.role === "admin";

  async function exportAll() {
    setExporting(true);
    const out: Record<string, unknown> = { app: "4 Rivers", exportedAt: new Date().toISOString() };
    const take = async (key: string, fn: () => Promise<unknown>) => {
      try {
        out[key] = await fn();
      } catch {
        out[key] = null;
      }
    };
    await take("course", () => repository.loadAll());
    await take("journal", () => repository.listJournalEntries());
    await take("practice", () => repository.listPracticeCheckins());
    await take("reviews", () => repository.listQuizReviews());
    await take("calculatorScenarios", () => repository.listScenarios());
    await take("groups", async () => (await repository.listMyGroups()).map((g) => ({ name: g.name, id: g.id })));
    if (snapshot?.profile.wealthStatus === "approved") await take("wealthClients", () => repository.listWealthClients());
    downloadFile(`4-rivers-my-data-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out, null, 2), "application/json");
    setExporting(false);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await repository.deleteMyAccount();
      await signOut().catch(() => undefined);
      onDeleted();
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setError(
        /leads a group/.test(m)
          ? t("data2.errLeader")
          : /admin/.test(m)
            ? t("data2.errAdmin")
            : /sample/.test(m)
              ? t("data2.errDemo")
              : /(schema cache|does not exist|Could not find)/i.test(m)
                ? t("data2.errSetup")
                : t("community.error", { message: m }),
      );
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="your-data-title" className="flex flex-col gap-3 border-t border-line pt-4 font-[family-name:var(--font-ui)]">
      <h3 id="your-data-title" className="text-xs font-medium uppercase tracking-wide text-ink-soft">
        {t("data2.title")}
      </h3>
      <div className="flex flex-col gap-1">
        <Button type="button" variant="secondary" className="w-fit" disabled={exporting} onClick={() => void exportAll()}>
          {exporting ? t("data2.exporting") : t("data2.export")}
        </Button>
        <p className="text-xs text-ink-soft">{t("data2.exportHint")}</p>
      </div>
      {isAdmin ? (
        <p className="text-xs text-ink-soft">{t("data2.adminNote")}</p>
      ) : !asking ? (
        <button type="button" onClick={() => setAsking(true)} className="w-fit text-xs font-medium text-red-700 underline-offset-2 hover:underline">
          {t("data2.delete")}
        </button>
      ) : (
        <div className="section-open flex flex-col gap-2 rounded-md border border-red-700/30 bg-red-700/5 p-3">
          <p className="text-sm font-semibold text-ink">{t("data2.confirmTitle")}</p>
          <p className="text-xs leading-relaxed text-ink-soft">{t("data2.confirmText")}</p>
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            {t("data2.typeIt")}
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              autoComplete="off"
              className="w-40 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-red-700 focus:outline-none"
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => (setAsking(false), setWord(""), setError(null))}>
              {t("common.cancel")}
            </Button>
            <button
              type="button"
              disabled={word !== "DELETE" || busy}
              onClick={() => void remove()}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
            >
              {busy ? t("data2.deleting") : t("data2.deleteForever")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
