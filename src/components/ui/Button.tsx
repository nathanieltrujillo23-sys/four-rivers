import { useRef, useState, type ButtonHTMLAttributes, type PointerEvent, type Ref } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "tour";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-water-deep text-white hover:bg-water disabled:opacity-50 disabled:hover:bg-water-deep",
  secondary:
    "bg-parchment-deep text-ink border border-line hover:bg-line disabled:opacity-50",
  ghost: "text-ink-soft hover:text-ink hover:bg-parchment-deep",
  danger: "text-red-700 hover:bg-red-50",
  tour: "bg-water-deep text-white hover:brightness-110 disabled:opacity-50",
};

/** Ripple tint per variant — light on dark buttons, dark on light ones. */
const RIPPLE_COLOR: Record<Variant, string> = {
  primary: "rgba(250,245,236,0.5)",
  secondary: "rgba(44,38,32,0.12)",
  ghost: "rgba(44,38,32,0.12)",
  danger: "rgba(185,28,28,0.18)",
  tour: "rgba(255,255,255,0.45)",
};

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function Button({
  variant = "primary",
  className = "",
  children,
  onPointerDown,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; ref?: Ref<HTMLButtonElement> }) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (!disabled) {
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.8;
      const id = nextId.current++;
      setRipples((r) => [
        ...r,
        { id, x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, size },
      ]);
    }
    onPointerDown?.(e);
  }

  return (
    <button
      className={`relative overflow-hidden rounded-lg px-4 py-2 text-sm font-medium font-[family-name:var(--font-ui)] transition-[background-color,transform] duration-150 active:scale-[0.96] disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
        {ripples.map((r) => (
          <span
            key={r.id}
            className="btn-ripple absolute rounded-full"
            style={{ left: r.x, top: r.y, width: r.size, height: r.size, backgroundColor: RIPPLE_COLOR[variant] }}
            onAnimationEnd={() => setRipples((prev) => prev.filter((p) => p.id !== r.id))}
          />
        ))}
      </span>
      <span className="relative">{children}</span>
    </button>
  );
}
