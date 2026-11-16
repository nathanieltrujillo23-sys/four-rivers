/**
 * The course map's drawing (Update 39), shared by the course home and the public home page: one source at the top,
 * the Introduction running down to a split, and four rivers bending out to their columns and down to their quizzes.
 */
export const W = 800;
export const H = 300;
export const SRC = { x: 400, y: 26 };
export const SPLIT = { x: 400, y: 104 };
export const END_Y = 270;
export const BRANCH_X = [100, 300, 500, 700];

export type Pt = { x: number; y: number };

/**
 * A branch: from the split it runs down, bends out to its column, and runs straight down to the quiz. `at(t)` places a
 * point by distance along the branch (0 = the split, 1 = the end), so lesson stops are evenly spaced.
 */
export function branch(i: number): { d: string; at: (t: number) => Pt } {
  const x = BRANCH_X[i];
  const p0 = SPLIT;
  const p1 = { x: SPLIT.x, y: SPLIT.y + 46 };
  const p2 = { x, y: SPLIT.y + 46 };
  const p3 = { x, y: SPLIT.y + 104 };
  const curve = (t: number): Pt => {
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
  };
  const pts: Pt[] = [];
  for (let k = 0; k <= 60; k++) pts.push(curve(k / 60));
  pts.push({ x, y: END_Y });
  const lens = [0];
  for (let k = 1; k < pts.length; k++) lens.push(lens[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  const total = lens[lens.length - 1];
  const at = (t: number): Pt => {
    const target = Math.min(1, Math.max(0, t)) * total;
    let k = 1;
    while (k < lens.length - 1 && lens[k] < target) k++;
    const f = (target - lens[k - 1]) / (lens[k] - lens[k - 1] || 1);
    return { x: pts[k - 1].x + f * (pts[k].x - pts[k - 1].x), y: pts[k - 1].y + f * (pts[k].y - pts[k - 1].y) };
  };
  return { d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y} L ${x} ${END_Y}`, at };
}

