import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import type { Group, GroupMember, GroupMessage } from "../../types";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";

const POLL_MS = 12_000;

/** A person's picture with their name in small text underneath. */
function ChatPerson({ avatar, name }: { avatar: string | null | undefined; name: string }) {
  return (
    <div className="mb-3.5 flex w-14 shrink-0 flex-col items-center gap-0.5">
      <Avatar value={avatar} name={name} size={32} />
      <span className="w-full truncate text-center font-[family-name:var(--font-ui)] text-[10px] leading-tight text-ink-soft">
        {name}
      </span>
    </div>
  );
}

function merge(prev: GroupMessage[], incoming: GroupMessage[]): GroupMessage[] {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * The group's chat. Messages arrive live (Supabase Realtime), with a slow poll
 * as a safety net in case the live connection drops. Anyone can delete their
 * own message; the leader can delete any.
 */
export function GroupChat({
  group,
  myId,
  isLeader,
  members,
}: {
  group: Group;
  myId: string;
  isLeader: boolean;
  members: GroupMember[];
}) {
  const { repository } = useCourse();
  const { lang, t } = useLang();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(members.map((m) => [m.userId, m]));
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await repository.listMessages(group.id);
      setMessages((prev) => merge(prev, rows));
    } catch {
      /* the next poll will try again */
    }
  }, [repository, group.id]);

  useEffect(() => {
    setMessages([]);
    void refresh();
    const stop = repository.subscribeMessages(group.id, {
      onInsert: (m) => setMessages((prev) => merge(prev, [m])),
      onDelete: (id) => setMessages((prev) => prev.filter((m) => m.id !== id)),
    });
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      stop();
      window.clearInterval(timer);
    };
  }, [repository, group.id, refresh]);

  // Keep the newest message in view unless the reader scrolled up on purpose.
  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const m = await repository.sendMessage(group.id, body);
      stick.current = true;
      setMessages((prev) => merge(prev, [m]));
      setText("");
    } catch {
      setError(t("chat.error"));
    } finally {
      setSending(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const timeFmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dayFmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="flex h-full flex-col">
      <CardBody className="flex min-h-0 flex-1 flex-col gap-3">
        <h2 className="t-h4">{t("chat.title")}</h2>

        <div
          ref={listRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
          }}
          className="flex h-[26rem] flex-col gap-2 overflow-y-auto rounded-xl bg-parchment-deep/30 p-3"
          aria-live="polite"
        >
          {messages.length === 0 && (
            <p className="m-auto text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {t("chat.empty")}
            </p>
          )}
          {messages.map((m, i) => {
            const mine = m.userId === myId;
            // Show the person's current preferred name and picture, not what they were at send time.
            const author = byId.get(m.userId);
            const name = author?.displayName || m.authorName;
            const d = new Date(m.createdAt);
            const newDay = i === 0 || new Date(messages[i - 1].createdAt).toDateString() !== d.toDateString();
            return (
              <div key={m.id} className="flex flex-col gap-1">
                {newDay && (
                  <p className="my-1 text-center font-[family-name:var(--font-ui)] text-[11px] uppercase tracking-wide text-ink-soft">
                    {dayFmt.format(d)}
                  </p>
                )}
                <div className={`group flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine && <ChatPerson avatar={author?.avatar} name={name} />}
                  <div className={`max-w-[85%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="flex items-end gap-1">
                      {(mine || isLeader) && (
                        <button
                          type="button"
                          aria-label={t("chat.delete")}
                          title={t("chat.delete")}
                          onClick={() => {
                            setMessages((prev) => prev.filter((x) => x.id !== m.id));
                            void repository.deleteMessage(m.id).catch(() => void refresh());
                          }}
                          className={`order-first h-5 w-5 shrink-0 rounded-full text-xs text-ink-soft opacity-0 transition-opacity hover:text-red-700 focus:opacity-100 group-hover:opacity-100 ${mine ? "" : "order-last"}`}
                        >
                          ×
                        </button>
                      )}
                      <p
                        className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[15px] leading-snug ${
                          mine
                            ? "rounded-br-sm bg-water-deep text-white"
                            : "rounded-bl-sm bg-surface text-ink shadow-sm"
                        }`}
                      >
                        {m.body}
                      </p>
                    </div>
                    <span className="px-1 pt-0.5 font-[family-name:var(--font-ui)] text-[10px] text-ink-soft">
                      {timeFmt.format(d)}
                    </span>
                  </div>
                  {mine && <ChatPerson avatar={author?.avatar} name={name} />}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={send} className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            rows={2}
            maxLength={1000}
            placeholder={t("chat.placeholder")}
            aria-label={t("chat.placeholder")}
            className="min-h-0 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 font-[family-name:var(--font-ui)] text-base text-ink focus:border-water focus:outline-none"
          />
          <Button type="submit" disabled={!text.trim() || sending}>
            {t("chat.send")}
          </Button>
        </form>
        {error && (
          <p className="font-[family-name:var(--font-ui)] text-xs text-red-700" role="alert">
            {error}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
