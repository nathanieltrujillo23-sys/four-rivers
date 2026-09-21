import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-water-deep text-parchment hover:bg-water disabled:opacity-50 disabled:hover:bg-water-deep",
  secondary:
    "bg-parchment-deep text-ink border border-line hover:bg-line disabled:opacity-50",
  ghost: "text-ink-soft hover:text-ink hover:bg-parchment-deep",
  danger: "text-red-700 hover:bg-red-50",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium font-[family-name:var(--font-ui)] transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
