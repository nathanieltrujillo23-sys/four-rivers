import QRCode from "qrcode";
import { THEME } from "../theme/theme";

export type CertificateShape = "wide" | "square";

export const CERTIFICATE_SIZES: Record<CertificateShape, { w: number; h: number }> = {
  /** Fits a LinkedIn or Facebook post. */
  wide: { w: 1200, h: 630 },
  /** Fits an Instagram post. */
  square: { w: 1080, h: 1080 },
};

export interface CertificateText {
  title: string;
  certifies: string;
  name: string;
  completed: string;
  course: string;
  date: string | null;
  scan: string;
}

/**
 * Draws the certificate as a PNG for sharing. The page's own certificate is for printing; this one is laid
 * out for a social post and carries the same verification QR code, so anyone can confirm it is genuine.
 */
export async function certificateImage(
  shape: CertificateShape,
  text: CertificateText,
  verifyUrl: string,
): Promise<Blob> {
  const { w, h } = CERTIFICATE_SIZES[shape];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  const P = THEME.palette;
  const wide = shape === "wide";

  ctx.fillStyle = P.parchment;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, w - 48, h - 48);
  ctx.strokeStyle = P.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, w - 80, h - 80);

  const serif = "Georgia, 'Times New Roman', serif";
  const sans = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const cx = wide ? w * 0.38 : w / 2;

  // The four river colors across the top.
  const barW = wide ? 70 : 90;
  THEME.motif.flow.forEach((color, i) => {
    ctx.fillStyle = color;
    const x = cx - (barW * 4 + 18 * 3) / 2 + i * (barW + 18);
    ctx.beginPath();
    ctx.roundRect(x, wide ? 82 : 130, barW, 9, 5);
    ctx.fill();
  });

  const fit = (str: string, max: number, start: number, weight = "") => {
    let size = start;
    do {
      ctx.font = `${weight} ${size}px ${serif}`.trim();
      size -= 2;
    } while (ctx.measureText(str).width > max && size > 18);
  };
  const maxText = wide ? w * 0.62 : w - 160;

  ctx.fillStyle = P.inkSoft;
  ctx.font = `600 ${wide ? 20 : 26}px ${sans}`;
  ctx.fillText(text.title.toUpperCase().split("").join(wide ? " " : "  "), cx, wide ? 150 : 230);

  ctx.font = `italic ${wide ? 26 : 32}px ${serif}`;
  ctx.fillText(text.certifies, cx, wide ? 215 : 330);

  ctx.fillStyle = P.ink;
  fit(text.name, maxText, wide ? 66 : 84, "600");
  ctx.fillText(text.name, cx, wide ? 295 : 450);

  ctx.fillStyle = P.inkSoft;
  ctx.font = `italic ${wide ? 26 : 32}px ${serif}`;
  ctx.fillText(text.completed, cx, wide ? 355 : 540);

  ctx.fillStyle = P.ink;
  fit(text.course, maxText, wide ? 40 : 54, "600");
  ctx.fillText(text.course, cx, wide ? 415 : 625);

  if (text.date) {
    ctx.fillStyle = P.inkSoft;
    ctx.font = `600 ${wide ? 18 : 24}px ${sans}`;
    ctx.fillText(text.date.toUpperCase(), cx, wide ? 475 : 675);
  }

  ctx.fillStyle = P.waterDeep;
  ctx.font = `600 ${wide ? 24 : 30}px ${serif}`;
  ctx.fillText("4 Rivers", cx, wide ? 540 : 740);

  // The verification code.
  const qrSize = wide ? 200 : 190;
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: qrSize * 2, color: { dark: P.ink, light: "#ffffff" } });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("qr failed"));
    el.src = qr;
  });
  const qx = wide ? w * 0.78 - qrSize / 2 : w / 2 - qrSize / 2;
  const qy = wide ? h / 2 - qrSize / 2 - 12 : 785;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(qx - 10, qy - 10, qrSize + 20, qrSize + 20);
  ctx.drawImage(img, qx, qy, qrSize, qrSize);
  ctx.fillStyle = P.inkSoft;
  ctx.font = `${wide ? 15 : 20}px ${sans}`;
  ctx.fillText(text.scan.toUpperCase(), qx + qrSize / 2, qy + qrSize + (wide ? 36 : 44));

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("image failed"))), "image/png"),
  );
}
