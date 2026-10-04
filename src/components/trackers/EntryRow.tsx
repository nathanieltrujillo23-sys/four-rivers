import { formatDate } from "../../utils/format";
import { useT } from "../../i18n/LanguageContext";

/** One logged ledger row, with a delete affordance. */
export function EntryRow({
  primary,
  secondary,
  amount,
  createdAt,
  onDelete,
}: {
  primary: string;
  secondary?: string;
  amount: string;
  createdAt: string;
  onDelete: () => void;
}) {
  const t = useT();
  return (
    <li className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0 font-[family-name:var(--font-ui)]">
      <div className="min-w-0 flex-1">
        <div className="break-words text-sm text-ink">{primary}</div>
        <div className="break-words text-xs text-ink-soft">
          {secondary ? `${secondary} · ` : ""}
          {formatDate(createdAt)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-semibold tabular-nums text-ink">
          {amount}
        </span>
        <button
          type="button"
          aria-label={t("trk.deleteAria", { name: primary })}
          onClick={onDelete}
          className="text-xs text-ink-soft hover:text-red-700"
        >
          {t("trk.delete")}
        </button>
      </div>
    </li>
  );
}
