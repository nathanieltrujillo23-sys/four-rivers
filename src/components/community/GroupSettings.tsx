import { useState } from "react";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import type { Group, GroupMember } from "../../types";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, Select, TextInput } from "../ui/Field";

/**
 * Settings only the group's own leader sees: rename, a new join code, pausing
 * joins, handing the group to another approved leader, and archiving.
 */
export function GroupSettings({
  group,
  members,
  patch,
  onTransferred,
  onArchived,
}: {
  group: Group;
  members: GroupMember[];
  patch: (change: Partial<Group>) => void;
  onTransferred: () => void;
  onArchived: () => void;
}) {
  const { repository } = useCourse();
  const { t } = useLang();
  const [name, setName] = useState(group.name);
  const [heir, setHeir] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<string | void>, okKey?: string) {
    setBusy(true);
    setMessage(null);
    try {
      const done = await action();
      if (okKey) setMessage({ kind: "ok", text: t(okKey as "gs.renamed", { code: done ?? "" }) });
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      if (/new leader must be approved/i.test(text))
        setMessage({ kind: "error", text: t("gs.needApproved") });
      else if (/too many groups/i.test(text)) setMessage({ kind: "error", text: t("gs.tooMany") });
      else setMessage({ kind: "error", text: t("community.error", { message: text }) });
    } finally {
      setBusy(false);
    }
  }

  const candidates = members.filter((m) => !m.isLeader);

  return (
    <Card>
      <CardBody className="flex flex-col gap-6">
        <div>
          <h2 className="t-h4">{t("gs.title")}</h2>
          <p className="font-[family-name:var(--font-ui)] text-sm text-ink-soft">{t("gs.sub")}</p>
        </div>

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const next = name.trim();
            if (!next || next === group.name) return;
            void run(async () => {
              await repository.renameGroup(group.id, next);
              patch({ name: next });
            }, "gs.renamed");
          }}
        >
          <div className="min-w-56 flex-1">
            <Field label={t("gs.name")}>
              <TextInput value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <Button
            type="submit"
            variant="secondary"
            disabled={busy || !name.trim() || name.trim() === group.name}
          >
            {t("gs.rename")}
          </Button>
        </form>

        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <label className="flex cursor-pointer items-start gap-3 font-[family-name:var(--font-ui)] text-sm text-ink">
            <input
              type="checkbox"
              checked={group.joinEnabled}
              disabled={busy}
              onChange={(e) => {
                // Show the change right away; put it back if the server refuses.
                const enabled = e.target.checked;
                patch({ joinEnabled: enabled });
                void run(async () => {
                  try {
                    await repository.setGroupJoining(group.id, enabled);
                  } catch (err) {
                    patch({ joinEnabled: !enabled });
                    throw err;
                  }
                });
              }}
              className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]"
            />
            <span>
              {t("gs.joining")}
              <span className="block text-xs text-ink-soft">{t("gs.joiningHint")}</span>
            </span>
          </label>
          {group.codeLocked ? (
            <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("gs.codeLocked")}</p>
          ) : (
          <div>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                if (!window.confirm(t("gs.newCodeConfirm"))) return;
                void run(async () => {
                  const code = await repository.regenerateGroupCode(group.id);
                  patch({ joinCode: code });
                  return code;
                }, "gs.newCodeDone");
              }}
            >
              {t("gs.newCode")}
            </Button>
            <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft">
              {t("gs.newCodeHint")}
            </p>
          </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-5">
          <h3 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
            {t("gs.handOver")}
          </h3>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("gs.handOverHint")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-48">
              <Select value={heir} onChange={(e) => setHeir(e.target.value)} aria-label={t("gs.handOver")}>
                <option value="">{t("gs.pick")}</option>
                {candidates.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              variant="secondary"
              disabled={busy || !heir}
              onClick={() => {
                const who = candidates.find((m) => m.userId === heir)?.displayName ?? "";
                if (!window.confirm(t("gs.handOverConfirm", { name: who }))) return;
                void run(async () => {
                  await repository.transferGroupLeadership(group.id, heir);
                  onTransferred();
                });
              }}
            >
              {t("gs.handOverBtn")}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-5">
          <h3 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
            {t("gs.archive")}
          </h3>
          <p className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">{t("gs.archiveHint")}</p>
          <div>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                if (!window.confirm(t("gs.archiveConfirm"))) return;
                void run(async () => {
                  await repository.setGroupArchived(group.id, true);
                  patch({ archivedAt: new Date().toISOString(), joinEnabled: false });
                  onArchived();
                });
              }}
            >
              {t("gs.archiveBtn")}
            </Button>
          </div>
        </div>

        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`font-[family-name:var(--font-ui)] text-sm ${message.kind === "ok" ? "text-olive" : "text-red-700"}`}
          >
            {message.text}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
