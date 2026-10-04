import { AVATAR_ICON_IDS, type AvatarIconId } from "../../lib/avatarIcons";
import { RIVERS } from "../../theme/theme";
import { SketchIcon } from "./SketchIcon";

export function iconFromValue(value: string | null | undefined): AvatarIconId | null {
  if (!value?.startsWith("icon:")) return null;
  const id = value.slice(5) as AvatarIconId;
  return AVATAR_ICON_IDS.includes(id) ? id : null;
}

/** Each sketch keeps its own river color, so the same icon always looks the same. */
export function iconColor(id: AvatarIconId): string {
  return RIVERS[AVATAR_ICON_IDS.indexOf(id) % RIVERS.length].accent;
}

function hash(text: string): number {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return h;
}

/**
 * A person's picture: their uploaded photo, their chosen sketch, or (when they
 * have neither) their initial on one of the four river colors.
 */
export function Avatar({
  value,
  name,
  size = 32,
  className = "",
}: {
  value?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const box = { width: size, height: size };
  if (value?.startsWith("data:image/")) {
    return (
      <img src={value} alt="" style={box} className={`shrink-0 rounded-full object-cover ${className}`} />
    );
  }
  const icon = iconFromValue(value);
  if (icon) {
    return (
      <span
        style={box}
        className={`flex shrink-0 items-center justify-center rounded-full bg-parchment-deep ${className}`}
        aria-hidden="true"
      >
        <SketchIcon id={icon} color={iconColor(icon)} size={Math.round(size * 0.78)} />
      </span>
    );
  }
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      style={{ ...box, backgroundColor: RIVERS[hash(name) % RIVERS.length].accent, fontSize: size * 0.45 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-ui)] font-semibold text-white ${className}`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
