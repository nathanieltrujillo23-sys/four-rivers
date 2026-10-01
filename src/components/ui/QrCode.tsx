import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** A small, self-contained QR code rendered to inline SVG (no network call,
 * no canvas — scales cleanly when printed). Renders nothing while the code
 * is being generated, and silently omits itself if generation fails. */
export function QrCode({ value, size = 96, color = "#2b2318" }: { value: string; size?: number; color?: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, { type: "svg", margin: 1, color: { dark: color, light: "#00000000" } })
      .then((markup) => {
        if (!cancelled) setSvg(markup);
      })
      .catch(() => {
        if (!cancelled) setSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, color]);

  if (!svg) return null;

  return (
    <div
      style={{ width: size, height: size }}
      aria-label="QR code linking to this certificate's verification page"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
