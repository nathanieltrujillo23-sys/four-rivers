import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOptionalCourse } from "../../state/CourseContext";
import { useNotifications } from "../../state/useNotifications";
import { useLang } from "../../i18n/LanguageContext";
import { Avatar } from "../ui/Avatar";

function ago(iso: string, lang: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const fmt = new Intl.RelativeTimeFormat(lang === "es" ? "es" : "en", { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return fmt.format(0, "second");
  if (abs < 3600) return fmt.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return fmt.format(Math.round(seconds / 3600), "hour");
  return fmt.format(Math.round(seconds / 86400), "day");
}

/**
 * A bell for the header. Its badge counts what happened in my groups since I
 * last looked: someone joined, or someone passed the final exam. Opening it
 * lists the latest and clears the count (the "New" tags stay until it closes).
 */
export function NotificationBell() {
  const course = useOptionalCourse();
  const { items, unread, refresh, markSeen } = useNotifications(course?.repository ?? null);
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // The panel belongs to the page it was opened on, so navigating closes it.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (v: boolean) => setOpenPath(v ? pathname : null);
  // Which items were new at the moment the panel opened.
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpenPath(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpenPath(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!course?.snapshot) return null;

  async function toggle() {
    if (!open) {
      setFreshIds(new Set(items.filter((n) => n.unread).map((n) => n.id)));
      setOpen(true);
      if (unread > 0) {
        await markSeen();
        await refresh();
      }
    } else {
      setOpen(false);
    }
  }

  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={unread > 0 ? `${t("notify.label")} (${unread})` : t("notify.label")}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-parchment-deep hover:text-ink"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 9.5a6 6 0 1 1 12 0c0 4.2 1.6 5.6 2 6.5H4c.4-.9 2-2.3 2-6.5ZM10 19.5a2.2 2.2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 font-[family-name:var(--font-ui)] text-[10px] font-semibold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("notify.label")}
          className="pop-in fixed inset-x-4 top-14 z-40 overflow-hidden rounded-xl border border-line bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80"
        >
          <p className="border-b border-line px-4 py-2.5 font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
            {t("notify.label")}
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-5 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {t("notify.empty")}
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(`/community/${n.groupId}`);
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-parchment-deep/60"
                  >
                    <Avatar value={n.actorAvatar} name={n.actorName} size={32} />
                    <span className="min-w-0 flex-1 font-[family-name:var(--font-ui)] text-sm text-ink">
                      {n.kind === "exam_passed"
                        ? t("notify.exam", { name: n.actorName })
                        : n.kind === "prayer_answered"
                          ? t(n.mine ? "notify.prayerMine" : "notify.prayer", { name: n.actorName, note: n.note ?? "" })
                          : t("notify.joined", { name: n.actorName, group: n.groupName })}
                      <span className="mt-0.5 block text-xs text-ink-soft">
                        {ago(n.createdAt, lang)}
                        {n.kind !== "joined" && ` · ${n.groupName}`}
                      </span>
                    </span>
                    {freshIds.has(n.id) && (
                      <span className="mt-1 shrink-0 rounded-full bg-clay/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-clay">
                        {t("notify.new")}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
