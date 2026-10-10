import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { GlossaryEntry } from "../../content/glossary";
import { useLang } from "../../i18n/LanguageContext";

const POPOVER_W = 288;

/**
 * An inline, dotted-underlined word with a plain-language definition. Opens
 * on hover, focus, or tap; Escape or tapping elsewhere closes it. Positioned
 * against the viewport so it never runs off the screen edge.
 */
export function GlossaryTerm({ entry, children }: { entry: GlossaryEntry; children: ReactNode }) {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean }>({
    top: 0,
    left: 0,
    above: false,
  });
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLSpanElement>(null);

  const place = useCallback(() => {
    const el = button.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(POPOVER_W, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 8));
    const above = r.bottom + 190 > window.innerHeight && r.top > 200;
    setPos({ top: above ? r.top - 6 : r.bottom + 6, left, above });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!button.current?.contains(target) && !popover.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onMove = () => place();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, place]);

  const show = () => {
    place();
    setOpen(true);
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : show())}
        onMouseEnter={show}
        onMouseLeave={(e) => {
          if (!popover.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        className="cursor-help rounded-sm border-0 bg-transparent p-0 font-[inherit] text-[inherit] underline decoration-dotted decoration-ink-soft/70 underline-offset-4 hover:decoration-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-water"
      >
        {children}
      </button>
      {open && (
        <span
          ref={popover}
          role="tooltip"
          onMouseLeave={() => setOpen(false)}
          className="pop-in fixed z-50 block rounded-xl border border-line bg-surface p-3 text-left font-[family-name:var(--font-ui)] text-sm font-normal not-italic leading-snug text-ink shadow-lg"
          style={{
            top: pos.top,
            left: pos.left,
            width: Math.min(POPOVER_W, typeof window === "undefined" ? POPOVER_W : window.innerWidth - 16),
            transform: pos.above ? "translateY(-100%)" : undefined,
          }}
        >
          <span className="block font-semibold text-ink">{entry.term[lang]}</span>
          <span className="mt-1 block text-ink-soft">{entry.definition[lang]}</span>
          <Link
            to={`/glossary#${entry.id}`}
            className="mt-2 inline-block text-xs font-medium text-water-deep underline-offset-2 hover:underline"
          >
            {t("glossary.seeAll")}
          </Link>
        </span>
      )}
    </>
  );
}
