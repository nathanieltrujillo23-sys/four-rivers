/**
 * Who belongs to the Daily Bread members' space, and which of its three tool sets each person has. Membership is simply
 * being approved for Wealth, Investment Banking or Consulting Tools (admins always are); the database enforces the same rule.
 */
import type { FeatureIconName } from "../components/ui/FeatureIcons";
import type { LeaderStatus, Profile } from "../types";

export type DailyBreadTool = "wealth" | "ib" | "consulting";
export const DAILY_BREAD_TOOLS: DailyBreadTool[] = ["wealth", "ib", "consulting"];

/** What each tool set is called, where it lives, its icon, and its one-line summary. */
export const TOOL_INFO: Record<DailyBreadTool, { name: string; path: string; icon: FeatureIconName; line: `db.${DailyBreadTool}Line` }> = {
  wealth: { name: "Wealth Tools", path: "/community/wealth", icon: "pie", line: "db.wealthLine" },
  ib: { name: "Investment Banking Tools", path: "/community/ib", icon: "briefcase", line: "db.ibLine" },
  consulting: { name: "Consulting Tools", path: "/community/consulting", icon: "grid", line: "db.consultingLine" },
};

export interface ToolAccess {
  tool: DailyBreadTool;
  /** "unavailable" means the database does not have that tool set yet, so it is not offered. */
  status: LeaderStatus | "unavailable";
  open: boolean;
}

type StatusFields = Pick<Profile, "role" | "wealthStatus" | "ibStatus" | "consultingStatus">;

export function toolAccess(profile: StatusFields | undefined): ToolAccess[] {
  const admin = profile?.role === "admin";
  const raw: Record<DailyBreadTool, LeaderStatus | undefined> = {
    wealth: profile?.wealthStatus ?? "none",
    ib: profile?.ibStatus,
    consulting: profile?.consultingStatus,
  };
  return DAILY_BREAD_TOOLS.map((tool) => {
    const status = raw[tool];
    if (status === undefined) return { tool, status: "unavailable", open: false };
    return { tool, status, open: status === "approved" || admin };
  });
}

export const isDailyBreadMember = (profile: StatusFields | undefined) => toolAccess(profile).some((t) => t.open);
