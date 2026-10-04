/**
 * The sketched icons a learner can use instead of a photo. Each is a handful
 * of line paths in a 64x64 box, drawn twice by <SketchIcon> (a firm stroke plus
 * a faint offset one) so they read as pencil sketches. Add one here, give it a
 * name in i18n/strings/profile.ts, and it appears in the picker.
 */
export const AVATAR_ICON_IDS = [
  "cross",
  "lion",
  "lamb",
  "ram",
  "sword",
  "lily",
  "dove",
  "bread",
  "wheat",
  "oil",
  "menorah",
  "fish",
  "anchor",
  "crown",
  "crook",
  "olive",
  "star",
  "chirho",
  "tablets",
  "grapes",
  "shield",
  "harp",
  "key",
] as const;

export type AvatarIconId = (typeof AVATAR_ICON_IDS)[number];

const f = (n: number) => n.toFixed(1);

function circle(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(cy)} a${r} ${r} 0 1 0 ${f(2 * r)} 0 a${r} ${r} 0 1 0 ${f(-2 * r)} 0`;
}

/** A scalloped ring, used for the lion's mane. */
function mane(cx: number, cy: number, inner: number, outer: number, bumps: number): string {
  let d = "";
  for (let i = 0; i < bumps; i++) {
    const a0 = (i / bumps) * Math.PI * 2;
    const a1 = ((i + 1) / bumps) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const p0 = [cx + inner * Math.cos(a0), cy + inner * Math.sin(a0)];
    const p1 = [cx + inner * Math.cos(a1), cy + inner * Math.sin(a1)];
    const c = [cx + outer * Math.cos(am), cy + outer * Math.sin(am)];
    d += `${i === 0 ? `M${f(p0[0])} ${f(p0[1])}` : ""} Q${f(c[0])} ${f(c[1])} ${f(p1[0])} ${f(p1[1])}`;
  }
  return d + " Z";
}

function star(cx: number, cy: number, outer: number, inner: number, points: number): string {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))} `;
  }
  return d + "Z";
}

/** A lens-shaped leaf from (x, y) pointing at `angle` radians. */
function leaf(x: number, y: number, angle: number, len: number, wid: number): string {
  const ex = x + len * Math.cos(angle);
  const ey = y + len * Math.sin(angle);
  const nx = -Math.sin(angle) * wid;
  const ny = Math.cos(angle) * wid;
  const mx = x + (len / 2) * Math.cos(angle);
  const my = y + (len / 2) * Math.sin(angle);
  return `M${f(x)} ${f(y)} Q${f(mx + nx)} ${f(my + ny)} ${f(ex)} ${f(ey)} Q${f(mx - nx)} ${f(my - ny)} ${f(x)} ${f(y)} Z`;
}

function wheat(): string[] {
  const out = ["M32 58 L32 14"];
  for (let i = 0; i < 4; i++) {
    const y = 40 - i * 9;
    out.push(leaf(32, y, -Math.PI / 2 - 0.75, 11, 3.4));
    out.push(leaf(32, y, -Math.PI / 2 + 0.75, 11, 3.4));
  }
  out.push(leaf(32, 14, -Math.PI / 2, 10, 3.2));
  return out;
}

function olive(): string[] {
  const out = ["M12 54 C26 44 40 28 54 12"];
  const t = [0.28, 0.45, 0.62, 0.8];
  for (const k of t) {
    const x = 12 + 42 * k;
    const y = 54 - 42 * k - 4 * Math.sin(k * Math.PI);
    out.push(leaf(x, y, -Math.PI / 4 - 0.9, 10, 3));
    out.push(leaf(x, y, -Math.PI / 4 + 0.9, 10, 3));
  }
  out.push(leaf(54, 12, -Math.PI / 4, 8, 2.8));
  return out;
}

function menorah(): string[] {
  const out = ["M32 24 L32 54", "M20 56 L44 56", "M28 54 L36 54"];
  const arms: [number, number][] = [
    [46, 12],
    [40, 20],
    [34, 26],
  ];
  for (const [y, x] of arms) {
    out.push(`M32 ${y} C${x} ${y} ${x} ${y - 6} ${x} 26`);
    out.push(`M32 ${y} C${64 - x} ${y} ${64 - x} ${y - 6} ${64 - x} 26`);
  }
  for (const x of [12, 20, 26, 32, 38, 44, 52]) {
    out.push(`M${x} 26 L${x} 22`);
    out.push(`M${x} 11 C${x - 2.4} 15 ${x - 2.4} 18 ${x} 18 C${x + 2.4} 18 ${x + 2.4} 15 ${x} 11 Z`);
  }
  return out;
}

export const AVATAR_ICON_PATHS: Record<AvatarIconId, string[]> = {
  cross: ["M32 6 L32.8 58", "M16 22 L48.4 21.4", "M29.5 6.5 L34.4 6.2"],
  lion: [
    mane(32, 32, 20, 28, 12),
    "M20 26 C20 20 28 18 32 18 C36 18 44 20 44 26 L43 38 C41 46 36 49 32 49 C28 49 23 46 21 38 Z",
    "M26 30 L27.6 30.4 M37 30.4 L38.6 30",
    "M29 37 L35 37 L32 41 Z",
    "M32 41 C30 45 27 46 25 44 M32 41 C34 45 37 46 39 44",
    "M22 20 C19 16 24 14 26 19 M42 20 C45 16 40 14 38 19",
  ],
  lamb: [
    "M16 38 C9 36 10 27 17 27 C18 20 27 19 30 24 C34 18 43 20 43 27 C50 27 51 36 45 38 C44 42 38 43 35 40 C31 43 26 43 23 40 C20 42 17 41 16 38 Z",
    "M22 41 L22 53 M28 42 L28 53 M38 42 L38 53 M44 40 L44 53",
    "M44 30 C44 24 53 23 55 30 C57 36 53 40 48 38",
    "M50 26 L53.5 21",
    "M52.5 31 L53.2 31.4",
  ],
  ram: [
    "M26 27 C14 22 9 35 16 41 C21 45 28 41 25 35 C23 32 19 33 20 36",
    "M38 27 C50 22 55 35 48 41 C43 45 36 41 39 35 C41 32 45 33 44 36",
    "M26 27 C28 19 36 19 38 27 L37 45 C36 52 28 52 27 45 Z",
    "M29.4 32 L30.6 32 M33.4 32 L34.6 32",
    "M30 47.5 L30.4 48.6 M34 47.5 L33.6 48.6",
    "M27 22 L24 17 M37 22 L40 17",
  ],
  sword: [
    "M32 5 L36 11 L36 40 L28 40 L28 11 Z",
    "M32 12 L32 38",
    "M19 40 L45 40 L45 44 L19 44 Z",
    "M32 44 L32 54",
    circle(32, 57, 2.8),
  ],
  lily: [
    "M32 8 C25 18 25 28 32 34 C39 28 39 18 32 8 Z",
    "M32 34 C21 31 14 23 12 13 C23 14 30 23 32 34",
    "M32 34 C43 31 50 23 52 13 C41 14 34 23 32 34",
    "M32 34 L32 59",
    "M32 53 C25 52 21 47 19 42",
    "M32 47 C39 46 43 41 45 36",
    "M32 31 L32 21 M29 29 L26.5 22 M35 29 L37.5 22",
  ],
  dove: [
    "M16 36 C16 28 24 25 30 28 C36 30 42 33 54 28 C50 38 44 46 34 46 C24 48 16 44 16 36 Z",
    "M19 31.5 L20.2 31.8",
    "M14 34 L8 35.5 L14 37.5",
    "M25 31 C26 20 36 12 48 13 C45 22 40 30 33 37",
    "M31 29 C35 24 40 19 45 16",
    "M50 31 L59 33 M48 36 L57 40",
    "M8 36 C8 42 12 46 18 46",
    "M11 43.5 C9 42 10 39.5 12.5 39.8",
  ],
  bread: [
    "M9 40 C9 27 21 20 32 20 C43 20 55 27 55 40 C55 46 49 48 32 48 C15 48 9 46 9 40 Z",
    "M21 25 L25 39 M31 23 L33 39 M42 25 L39 39",
    "M10 48 C14 53 50 53 54 48",
  ],
  wheat: wheat(),
  oil: [
    "M22 26 C13 34 13 52 24 56 L40 56 C51 52 51 34 42 26 Z",
    "M26 26 L26 17 L38 17 L38 26",
    "M23 17 L41 17",
    "M45 30 C55 30 55 45 46 47",
    "M32 3 C28 8 28 11 32 11 C36 11 36 8 32 3 Z",
    "M17 38 C27 43 37 43 47 38",
  ],
  menorah: menorah(),
  fish: [
    "M8 32 C19 19 39 19 49 32 C39 45 19 45 8 32 Z",
    "M49 32 L59 21 M49 32 L59 43 M59 21 L59 43",
    circle(19, 30, 1.4),
    "M30 25 C34 29 34 35 30 39 M37 24 C41 28 41 36 37 40",
  ],
  anchor: [
    circle(32, 12, 4.5),
    "M32 17 L32 53",
    "M23 24 L41 24",
    "M12 40 C13 52 24 57 32 53 C40 57 51 52 52 40",
    "M8 43 L12 36 L18 41 M56 43 L52 36 L46 41",
  ],
  crown: [
    "M10 46 L10 24 L22 35 L32 18 L42 35 L54 24 L54 46 Z",
    "M9 52 L55 52",
    "M10 46 L54 46",
    circle(10, 21.5, 2),
    circle(32, 15.5, 2),
    circle(54, 21.5, 2),
  ],
  crook: ["M40 59 L40 22 C40 8 22 8 22 19 C22 25 28 26 30 22", "M36 59 L44 59"],
  olive: olive(),
  star: [star(32, 32, 27, 10, 8), circle(32, 32, 3)],
  chirho: ["M32 6 L32 58", "M16 22 L48 46 M48 22 L16 46", "M32 8 C46 8 46 25 32 25"],
  tablets: [
    "M13 55 L13 25 C13 12 30 12 30 25 L30 55 Z",
    "M34 55 L34 25 C34 12 51 12 51 25 L51 55 Z",
    "M18 28 L25 28 M18 34 L25 34 M18 40 L25 40 M18 46 L25 46",
    "M39 28 L46 28 M39 34 L46 34 M39 40 L46 40 M39 46 L46 46",
  ],
  grapes: [
    circle(21, 28, 5.5),
    circle(32, 28, 5.5),
    circle(43, 28, 5.5),
    circle(26.5, 38, 5.5),
    circle(37.5, 38, 5.5),
    circle(32, 48, 5.5),
    "M32 22 L32 13",
    "M32 15 C38 8 47 10 49 15 C45 20 36 20 32 15",
  ],
  shield: [
    "M32 6 L53 14 L53 32 C53 46 43 54 32 59 C21 54 11 46 11 32 L11 14 Z",
    "M32 17 L32 47",
    "M21 28 L43 28",
  ],
  harp: [
    "M16 12 L16 56",
    "M16 12 C30 8 46 14 50 26",
    "M50 26 C48 40 42 50 36 56",
    "M16 56 L36 56",
    "M22 11 L22 54 M28 10.5 L28 54 M34 12 L34 54 M40 15 L40 46 M45 19 L45 36",
  ],
  key: [circle(21, 21, 9), circle(21, 21, 3), "M28 28 L52 52", "M42 42 L47 37 M47 47 L52 42"],
};
