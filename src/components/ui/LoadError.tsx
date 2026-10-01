import { Button } from "./Button";
import { Card, CardBody } from "./Card";

/** A friendlier stand-in for a bare error message: what went wrong, plus a
 * one-click way to try the load again, instead of a dead end. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="font-[family-name:var(--font-ui)] text-sm text-ink">Something didn't load right.</p>
        <p className="max-w-sm font-[family-name:var(--font-ui)] text-xs text-ink-soft">{message}</p>
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </CardBody>
    </Card>
  );
}
