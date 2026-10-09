import { useEffect, useRef, useState } from "react";
import type { WorkshopSignature } from "../../../types";
import { Button } from "../../ui/Button";

/**
 * Takes a signature: drawn with a finger or mouse, or, for anyone who prefers a keyboard, the typed printed name
 * (ticked as "this is my signature"). Reports the signature, or null while there is none.
 */
export function SignaturePad({
  label,
  printedName,
  onChange,
}: {
  label: string;
  printedName: string;
  onChange: (sig: WorkshopSignature | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [inked, setInked] = useState(false);
  const [typed, setTyped] = useState(false);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1c2733";
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    canvas.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y);
    ctx.stroke();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    setInked(true);
    setTyped(false);
    onChange({ kind: "drawn", image: canvas.current!.toDataURL("image/png") });
  }
  function clear() {
    const c = canvas.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setInked(false);
    setTyped(false);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <canvas
        ref={canvas}
        width={600}
        height={160}
        role="img"
        aria-label={`${label}: draw here with a finger or the mouse`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="h-32 w-full touch-none rounded-lg border border-dashed border-line bg-white"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" onClick={clear} disabled={!inked && !typed}>
          Clear
        </Button>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={typed}
            disabled={!printedName.trim()}
            onChange={(e) => {
              const on = e.target.checked;
              setTyped(on);
              if (on) {
                canvas.current?.getContext("2d")?.clearRect(0, 0, 600, 160);
                setInked(false);
                onChange({ kind: "typed", text: printedName.trim() });
              } else onChange(null);
            }}
            className="h-4 w-4 accent-[var(--color-water-deep)]"
          />
          I'd rather use my typed name as my signature
        </label>
      </div>
    </div>
  );
}

/** A signature shown back: the drawing, or the typed name in a script face. */
export function SignatureView({ sig }: { sig: WorkshopSignature }) {
  return sig.kind === "drawn" ? (
    <img src={sig.image} alt="Signature" className="h-14 rounded border border-line bg-white" />
  ) : (
    <p className="font-[family-name:var(--font-display)] text-2xl italic text-ink">{sig.text}</p>
  );
}

