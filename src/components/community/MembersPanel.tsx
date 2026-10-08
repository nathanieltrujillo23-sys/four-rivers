import type { GroupMember } from "../../types";
import { useLang } from "../../i18n/LanguageContext";
import { Card, CardBody } from "../ui/Card";
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
    <Card>
      <CardBody>
        <div className="flex items-baseline justify-between">
          <h2 className="t-h4">{t("members.title")}</h2>
          <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{members.length}</span>
        </div>
        <ul className="mt-3 flex flex-col gap-1">
          {members.map((m) => {
            const isOnline = online.has(m.userId) || m.userId === myId;
            return (
              <li
                key={m.userId}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-[family-name:var(--font-ui)] text-sm text-ink"
              >
                <span className="relative shrink-0">
                  <Avatar value={m.avatar} name={m.displayName} size={30} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${isOnline ? "bg-olive" : "bg-line"}`}
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
                {(m.isLeader || m.isCoLeader) && (
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-gold-text)]">
                    {t(m.isLeader ? "members.leader" : "members.coLeader")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
