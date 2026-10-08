export const LOGO_IDS: readonly ["current", "droplet", "tile", "monogram", "ribbons", "orb"];
export type LogoId = (typeof LOGO_IDS)[number];
export const DEFAULT_LOGO: LogoId;
export const LOGOS: Record<LogoId, { name: string; note: string }>;
export interface LogoPalette {
  navy: string;
  gold: string;
  cream: string;
  rivers: string[];
  light: string[];
}
export const FIXED_PALETTE: LogoPalette;
export const APP_PALETTE: LogoPalette;
export function logoSvg(id: string, options?: { size?: number; uid?: string; palette?: LogoPalette; label?: string }): string;
