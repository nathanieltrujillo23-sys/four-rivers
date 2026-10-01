/**
 * Small line-art icons for the four rivers, matching the app's existing
 * hand-drawn SVG style (thin strokes, no fill) instead of relying on
 * platform emoji glyphs, which render as a different colorful pictograph on
 * every OS/browser. Each takes the river's own accent color.
 */

interface IconProps {
  color: string;
  size?: number;
}

export function SproutIcon({ color, size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 12C12 8 9 6 5 6C5 10 8 12 12 12Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.5C12 6.5 14.7 4.5 19 4.5C19 7.8 16.3 9.5 12 9.5Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DropletIcon({ color, size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3C12 3 5 11.2 5 15.8C5 19.5 8.13 22.5 12 22.5C15.87 22.5 19 19.5 19 15.8C19 11.2 12 3 12 3Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TreeIcon({ color, size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22V16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 3L6.5 10.5H9L5 16.5H19L15 10.5H17.5L12 3Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GiftIcon({ color, size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10.5" width="16" height="9.5" rx="1" stroke={color} strokeWidth="2" />
      <path d="M3.5 7.5H20.5V10.5H3.5V7.5Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 7.5V20" stroke={color} strokeWidth="2" />
      <path
        d="M12 7.5C12 7.5 9.2 3.5 7 5C4.8 6.5 8 7.5 12 7.5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.5C12 7.5 14.8 3.5 17 5C19.2 6.5 16 7.5 12 7.5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A single five-point star, used by the module-complete burst (replacing a
 * plain emoji star so it can take the river's own accent color). */
export function StarIcon({ color, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2.5L14.7 9.3L22 9.9L16.4 14.6L18.2 21.8L12 17.8L5.8 21.8L7.6 14.6L2 9.9L9.3 9.3L12 2.5Z" />
    </svg>
  );
}
