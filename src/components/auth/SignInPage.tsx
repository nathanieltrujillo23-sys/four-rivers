import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { Button } from "../ui/Button";
import { Field, TextInput } from "../ui/Field";
import { Card, CardBody } from "../ui/Card";

export function SignInPage() {
  const { user, signIn, signUp } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    const dest = (location.state as { from?: string } | null)?.from ?? "/course";
    return <Navigate to={dest} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email.trim(), password);
        if (error) setError(error);
      } else {
        const { error, needsConfirmation } = await signUp(email.trim(), password, displayName);
        if (error) setError(error);
        else if (needsConfirmation)
          setNotice("Check your inbox to confirm your email, then sign in.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="mb-1 text-2xl font-semibold text-ink">
        {mode === "signin" ? "Welcome back" : "Begin the course"}
      </h1>
      <p className="mb-6 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
        {mode === "signin"
          ? "Sign in to continue where you left off."
          : "Create an account to save your progress through the four rivers."}
      </p>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <Field label="Name (optional)">
                <TextInput
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we greet you?"
                />
              </Field>
            )}
            <Field label="Email">
              <TextInput
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" hint={mode === "signup" ? "At least 6 characters." : undefined}>
              <TextInput
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

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
              {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-center font-[family-name:var(--font-ui)] text-sm text-ink-soft">
            {mode === "signin" ? "No account yet? " : "Already have an account? "}
            <button
              type="button"
              className="font-medium text-water underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setNotice(null);
              }}
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </CardBody>
      </Card>

      <p className="mt-6 text-center font-[family-name:var(--font-ui)] text-xs text-ink-soft">
        <Link to="/" className="underline">
          Back to the overview
        </Link>
      </p>
    </div>
  );
}
