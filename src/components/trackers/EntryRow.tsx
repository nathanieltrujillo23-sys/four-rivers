import { formatDate } from "../../utils/format";

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
  return (
    <li className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0 font-[family-name:var(--font-ui)]">
      <div className="min-w-0">
        <div className="truncate text-sm text-ink">{primary}</div>
        <div className="truncate text-xs text-ink-soft">
          {secondary ? `${secondary} · ` : ""}
          {formatDate(createdAt)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-semibold tabular-nums text-ink">{amount}</span>
        <button
          type="button"
          aria-label={`Delete ${primary}`}
          onClick={onDelete}
          className="text-xs text-ink-soft hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
