/**
 * Access control — the ONE place role and (future) payment gating lives.
 *
 * v1 role model: Guest / Free / Admin.
 *   - Guest  = not signed in. Can only see marketing/landing content.
 *   - Free   = signed in. Full course + tracker access. No paywall in v1.
 *   - Admin  = Free + content management.
 *
 * Monetization is a DEFERRED decision. When a `Paid` tier is introduced, add it
 * to `Role`, implement `hasPaidPlan`, and gate the relevant features through
 * `canAccessPaidFeature` below. No other file should branch on payment state —
 * keep every "is this allowed?" question flowing through this module so the app
 * can go from mocked to live billing without a refactor.
 */

import type { Role } from "../types";

export type Viewer =
  | { kind: "guest" }
  | { kind: "user"; role: Role };

export const GUEST: Viewer = { kind: "guest" };

export function viewerFromRole(role: Role | null | undefined): Viewer {
  if (!role) return GUEST;
  return { kind: "user", role };
}

/** Landing page, about, sign-in. Everyone. */
export function canViewMarketing(_viewer: Viewer): boolean {
  return true;
}

/** The 4-step course and all companion trackers. */
export function canAccessCourse(viewer: Viewer): boolean {
  return viewer.kind === "user";
}

/** Lesson content editing / course administration. */
export function canManageContent(viewer: Viewer): boolean {
  return viewer.kind === "user" && viewer.role === "admin";
}

/* ---------------------------------------------------------------- *
 * Payment gating — mocked for v1. Everything below is a seam.
 * ---------------------------------------------------------------- */

/** Whether the viewer holds a paid plan. Always false until billing is wired. */
export function hasPaidPlan(_viewer: Viewer): boolean {
  return false;
}

/**
 * Gate for any feature that will eventually sit behind the Paid tier.
 * In v1 there are no paid features, so this returns true for any course user.
 * When billing lands, change the body — not the call sites.
 */
export function canAccessPaidFeature(viewer: Viewer, _feature: string): boolean {
  if (!canAccessCourse(viewer)) return false;
  // return hasPaidPlan(viewer);  <-- v2
  return true;
}
