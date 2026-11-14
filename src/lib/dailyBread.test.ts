import { describe, expect, it } from "vitest";
import { isDailyBreadMember, toolAccess } from "./dailyBread";

describe("the Daily Bread members' space", () => {
  it("is open to anyone approved for a tool set, and to admins", () => {
    expect(isDailyBreadMember({ role: "free" })).toBe(false);
    expect(isDailyBreadMember({ role: "free", wealthStatus: "requested", ibStatus: "none", consultingStatus: "none" })).toBe(false);
    expect(isDailyBreadMember({ role: "free", wealthStatus: "none", ibStatus: "approved" })).toBe(true);
    expect(isDailyBreadMember({ role: "admin" })).toBe(true);
    expect(isDailyBreadMember(undefined)).toBe(false);
  });

  it("lists the three tool sets in order and skips ones the database does not have", () => {
    const rows = toolAccess({ role: "free", wealthStatus: "approved", ibStatus: "requested" });
    expect(rows.map((r) => [r.tool, r.status, r.open])).toEqual([
      ["wealth", "approved", true],
      ["ib", "requested", false],
      ["consulting", "unavailable", false],
    ]);
    expect(toolAccess({ role: "admin", ibStatus: "none" }).every((r) => r.status === "unavailable" || r.open)).toBe(true);
  });
});
