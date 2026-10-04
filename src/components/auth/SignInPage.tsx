import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { useDemo } from "../../state/DemoContext";
import { useT } from "../../i18n/LanguageContext";
import { Button } from "../ui/Button";
import { Field, TextInput } from "../ui/Field";
import { Card, CardBody } from "../ui/Card";

export function SignInPage() {
  const { user, signIn, signUp } = useAuth();
  const t = useT();
  const { demoActive, startSession } = useDemo();
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user || demoActive) {
    const dest = (location.state as { from?: string } | null)?.from ?? "/course";
    return <Navigate to={dest} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    // Read straight from the form so browser autofill (which can skip onChange) still counts.
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const emailValue = String(form.get("email") ?? email).trim();
    const passwordValue = String(form.get("password") ?? password);
    if (!emailValue || !passwordValue) {
      setError(t("auth.enter"));
      return;
    }
    // The built-in demo account: no backend, nothing saved, everything unlocked.
    if (
      mode === "signin" &&
      emailValue.toLowerCase() === "demo" &&
      passwordValue.trim().toLowerCase() === "demo"
    ) {
      startSession();
      return;
    }
    if (mode === "signup" && (!displayName.trim() || !fullName.trim())) {
      setError(t("auth.needNames"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(emailValue, passwordValue);
        if (error) setError(error);
      } else {
        const { error, needsConfirmation } = await signUp(emailValue, passwordValue, displayName, fullName);
        if (error) setError(error);
        else if (needsConfirmation) setNotice(t("auth.confirm"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="mb-1 text-2xl font-semibold text-ink">
        {mode === "signin" ? t("auth.welcomeBack") : t("auth.begin")}
      </h1>
      <p className="mb-6 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        {mode === "signin" ? t("auth.signinSub") : t("auth.signupSub")}
      </p>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Field label={t("auth.email")}>
              <TextInput
                type="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={t("auth.password")} hint={mode === "signup" ? t("auth.pwHint") : undefined}>
              <TextInput
                type="password"
                name="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            {mode === "signup" && (
              <>
                <Field label={t("auth.preferred")} hint={t("auth.preferredHint")}>
                  <TextInput
                    type="text"
                    name="displayName"
                    autoComplete="nickname"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </Field>
                <Field label={t("auth.full")} hint={t("auth.fullHint")}>
                  <TextInput
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </Field>
              </>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 font-[family-name:var(--font-ui)]">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg bg-river-1/10 px-3 py-2 text-sm text-olive font-[family-name:var(--font-ui)]">
                {notice}
              </p>
            )}

            <Button type="submit" disabled={busy}>
              {busy ? t("auth.working") : mode === "signin" ? t("auth.signIn") : t("auth.createAccount")}
            </Button>
          </form>

          <p className="text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {mode === "signin" ? `${t("auth.noAccount")} ` : `${t("auth.haveAccount")} `}
            <button
              type="button"
              className="font-medium text-water underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setNotice(null);
              }}
            >
              {mode === "signin" ? t("auth.createOne") : t("auth.signIn")}
            </button>
          </p>
        </CardBody>
      </Card>

      <p className="mt-6 text-center font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        <Link to="/" className="underline">
          {t("auth.backOverview")}
        </Link>
      </p>
    </div>
  );
}
