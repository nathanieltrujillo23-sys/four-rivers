import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const baseControl =
  "rounded-lg bg-white border border-line px-3 py-2 text-ink text-base font-[family-name:var(--font-ui)] focus:outline-none focus:border-water";

export function Field({
  label,
  children,
  className = "",
  hint,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-ink-soft font-[family-name:var(--font-ui)] ${className}`}>
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-ink-soft/70">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseControl} ${props.className ?? ""}`} />;
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props} className={`${baseControl} ${props.className ?? ""}`}>
      {children}
    </select>
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${baseControl} min-h-28 resize-y ${props.className ?? ""}`} />
  );
}
