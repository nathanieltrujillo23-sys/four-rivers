import type { GroupMember } from "../../types";
import { useLang } from "../../i18n/LanguageContext";
import { Avatar } from "../ui/Avatar";

/** The roster, with a green dot beside anyone who is in the group right now. */
export function MembersPanel({
  members,
  online,
  myId,
}: {
  members: GroupMember[];
  online: Set<string>;
  myId: string;
}) {
  const { t } = useLang();
  return (
    <section className="cm-card p-5">
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink">{t("members.title")}</h2>
          <span className="cm-badge tabular-nums">{members.length}</span>
        </div>
        <ul className="mt-3 flex flex-col gap-1">
          {members.map((m) => {
            const isOnline = online.has(m.userId) || m.userId === myId;
            return (
              <li
                key={m.userId}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm text-ink transition-colors hover:bg-parchment-deep/50"
              >
                <span className="relative shrink-0">
                  <Avatar value={m.avatar} name={m.displayName} size={30} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${isOnline ? "presence-dot bg-olive" : "bg-line"}`}
                    title={isOnline ? t("members.onlineNow") : undefined}
                    aria-hidden="true"
                  />
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {m.displayName}
                  {m.userId === myId && (
                    <span className="ml-1 text-xs text-ink-soft">({t("members.you")})</span>
                  )}
                </span>
                {(m.isLeader || m.isCoLeader || m.isAnalyst) && (
                  <span className="cm-badge">
                    {t(m.isLeader ? "members.leader" : m.isCoLeader ? "members.coLeader" : "members.analyst")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
