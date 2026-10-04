import { AVATAR_ICON_PATHS, type AvatarIconId } from "../../lib/avatarIcons";

/** A sketched icon: a firm line plus a faint, slightly offset one, like pencil on paper. */
export function SketchIcon({ id, color, size = 32 }: { id: AvatarIconId; color: string; size?: number }) {
  const paths = AVATAR_ICON_PATHS[id];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <g strokeWidth={2.4}>
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g strokeWidth={1.1} opacity={0.4} transform="translate(.9 .7)">
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}
