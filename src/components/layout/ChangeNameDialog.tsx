import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useCourse } from "../../state/CourseContext";
import { useLang } from "../../i18n/LanguageContext";
import {
  currentSubscription,
  pushSupported,
  subscribeThisDevice,
  unsubscribeThisDevice,
} from "../../lib/push";
import { AVATAR_ICON_IDS } from "../../lib/avatarIcons";
import { fileToAvatar } from "../../lib/avatarImage";
import { Avatar, iconColor } from "../ui/Avatar";
import { SketchIcon } from "../ui/SketchIcon";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Field, TextInput } from "../ui/Field";

/**
 * Edits a learner's profile: the preferred name that greets them around the
 * app, the full name printed on their certificate, and their picture (a photo
 * or one of the sketched figures).
 */
export function ChangeNameDialog({ onClose }: { onClose: () => void }) {
  const { snapshot, updateNames, repository } = useCourse();
  const { lang, t } = useLang();
  const [displayName, setDisplayName] = useState(snapshot?.profile.displayName ?? "");
  const [fullName, setFullName] = useState(snapshot?.profile.fullName ?? "");
  const [avatar, setAvatar] = useState<string | null>(snapshot?.profile.avatar ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [emailReminders, setEmailReminders] = useState(!!snapshot?.profile.emailReminders);
  const isLeader = snapshot?.profile.leaderStatus === "approved" || snapshot?.profile.role === "admin";
  const [digestEmails, setDigestEmails] = useState(snapshot?.profile.digestEmails !== false);
  const [deviceOn, setDeviceOn] = useState(false);
  const [deviceNote, setDeviceNote] = useState<string | null>(null);
  const canPush = pushSupported();

  useEffect(() => {
    let alive = true;
    void currentSubscription().then((sub) => alive && setDeviceOn(!!sub));
    return () => {
      alive = false;
    };
  }, []);

  async function toggleDevice() {
    setDeviceNote(null);
    if (deviceOn) {
      const endpoint = await unsubscribeThisDevice();
      if (endpoint) await repository.removePushSubscription(endpoint).catch(() => {});
      setDeviceOn(false);
      return;
    }
    const result = await subscribeThisDevice();
    if (result.ok) {
      try {
        await repository.savePushSubscription({
          endpoint: result.endpoint,
          p256dh: result.p256dh,
          auth: result.auth,
        });
        setDeviceOn(true);
      } catch {
        setDeviceNote(t("rem.failed"));
      }
    } else {
      setDeviceNote(t(result.reason === "denied" ? "rem.denied" : "rem.failed"));
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setAvatar(await fileToAvatar(file));
    } catch {
      setError(t("profile.uploadError"));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const changed = avatar !== (snapshot?.profile.avatar ?? null);
      await updateNames({ displayName, fullName, ...(changed ? { avatar } : {}) });
      if (emailReminders !== !!snapshot?.profile.emailReminders) {
        await repository.setEmailReminders(emailReminders, lang);
      }
      if (isLeader && digestEmails !== (snapshot?.profile.digestEmails !== false)) {
        await repository.setDigestEmails(digestEmails);
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("name.saveFail");
      setError(/full_name/.test(message) ? t("name.needsMigration") : message);
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("name.title")}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <Card className="my-auto w-full max-w-md !bg-surface">
        <CardBody>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-ink">{t("name.title")}</h2>

            <div className="flex items-center gap-4">
              <Avatar value={avatar} name={displayName || fullName || "?"} size={72} />
              <div className="flex flex-col items-start gap-1 font-[family-name:var(--font-ui)]">
                <p className="text-sm font-medium text-ink">{t("profile.picture")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" onClick={() => fileInput.current?.click()}>
                    {t("profile.upload")}
                  </Button>
                  {avatar && (
                    <Button type="button" variant="ghost" onClick={() => setAvatar(null)}>
                      {t("profile.removePhoto")}
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    void handleFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 font-[family-name:var(--font-ui)] text-xs font-medium uppercase tracking-wide text-ink-soft">
                {t("profile.orSketch")}
              </p>
              <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label={t("profile.orSketch")}>
                {AVATAR_ICON_IDS.map((id) => {
                  const selected = avatar === `icon:${id}`;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={t(`avatar.${id}`)}
                      title={t(`avatar.${id}`)}
                      onClick={() => setAvatar(`icon:${id}`)}
                      className={`flex aspect-square items-center justify-center rounded-lg border bg-parchment-deep transition-colors hover:border-ink-soft ${
                        selected ? "border-water ring-2 ring-water" : "border-line"
                      }`}
                    >
                      <SketchIcon id={id} color={iconColor(id)} size={34} />
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label={t("name.preferred")} hint={t("name.preferredHint")}>
              <TextInput
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("name.preferredPh")}
              />
            </Field>
            <Field label={t("name.full")} hint={t("name.fullHint")}>
              <TextInput
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("name.fullPh")}
              />
            </Field>
            <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-3">
              <legend className="px-1 font-[family-name:var(--font-ui)] text-xs font-medium uppercase tracking-wide text-ink-soft">
                {t("rem.title")}
              </legend>
              <label className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
                <input
                  type="checkbox"
                  checked={emailReminders}
                  onChange={(e) => setEmailReminders(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]"
                />
                <span>
                  {t("rem.email")}
                  <span className="block text-xs text-ink-soft">{t("rem.emailHint")}</span>
                </span>
              </label>
              {isLeader && (
                <label className="flex cursor-pointer items-start gap-2 font-[family-name:var(--font-ui)] text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={digestEmails}
                    onChange={(e) => setDigestEmails(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--color-water-deep)]"
                  />
                  <span>
                    {t("rem.digest")}
                    <span className="block text-xs text-ink-soft">{t("rem.digestHint")}</span>
                  </span>
                </label>
              )}
              {canPush && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => void toggleDevice()}>
                    {deviceOn ? t("rem.deviceOff") : t("rem.deviceOn")}
                  </Button>
                  {deviceNote && (
                    <span role="status" className="font-[family-name:var(--font-ui)] text-xs text-clay">
                      {deviceNote}
                    </span>
                  )}
                </div>
              )}
            </fieldset>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? t("name.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>,
    document.body,
  );
}
