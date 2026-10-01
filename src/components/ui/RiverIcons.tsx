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

/** A small padlock — used wherever something (a quiz, the exam, the
 * certificate) is gated until an earlier step is finished. */
export function LockIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="2" />
      <path d="M8 11V7.5C8 5 9.8 3 12 3C14.2 3 16 5 16 7.5V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.6" fill={color} />
    </svg>
  );
}

/** A short document with lines of text — used for quiz/exam list entries. */
export function QuizIcon({ color, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="1.5" stroke={color} strokeWidth="2" />
      <path d="M8 8H16M8 12H16M8 16H12.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** A pencil — the admin-only "edit this text" affordance. */
export function PencilIcon({ color, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20L4.8 16.4L15.2 6C15.9 5.3 17 5.3 17.7 6L18.3 6.6C19 7.3 19 8.4 18.3 9.1L7.9 19.5L4 20Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M13.5 7.5L16.8 10.8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
