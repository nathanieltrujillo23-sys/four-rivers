import { describe, expect, it } from "vitest";
import { manifestOf, open, restoreOrder, seal, verify } from "../scripts/backup-lib.mjs";

const backup = () => {
  const tables = {
    profiles: [{ user_id: "u1" }, { user_id: "u2" }],
    groups: [{ id: "g1" }],
    group_members: [{ group_id: "g1", user_id: "u1" }],
  };
  return {
    format: 1,
    createdAt: "2026-10-06T00:00:00Z",
    source: "x.supabase.co",
    manifest: manifestOf(tables),
    tables,
    users: [{ id: "u1" }, { id: "u2" }],
  };
};

describe("backup file", () => {
  it("round-trips through encryption and refuses a wrong passphrase", () => {
    const sealed = seal(backup(), "a long enough passphrase");
    expect(sealed.toString("utf8")).not.toContain("u1");
    expect(open(sealed, "a long enough passphrase")).toEqual(backup());
    expect(() => open(sealed, "another long passphrase")).toThrow(/wrong passphrase/);
  });

  it("detects a file that was changed", () => {
    const sealed = seal(backup(), "a long enough passphrase");
    sealed[sealed.length - 3] ^= 0xff;
    expect(() => open(sealed, "a long enough passphrase")).toThrow();
  });

  it("insists on a real passphrase", () => {
    expect(() => seal(backup(), "short")).toThrow(/at least 12/);
  });
});

describe("verify", () => {
  it("accepts a consistent backup", () => {
    expect(verify(backup())).toEqual([]);
  });
  it("reports missing rows and orphaned profiles", () => {
    const b = backup();
    b.tables.groups = [];
    b.users = [{ id: "u1" }];
    const problems = verify(b);
    expect(problems.join(" ")).toMatch(/groups has 0 rows, expected 1/);
    expect(problems.join(" ")).toMatch(/1 profiles have no matching user/);
  });
});

describe("restoreOrder", () => {
  it("puts tables after the ones they point at", () => {
    const order = restoreOrder(["group_members", "groups", "profiles"], {
      group_members: ["groups", "profiles"],
      groups: ["profiles"],
    });
    expect(order).toEqual(["profiles", "groups", "group_members"]);
  });
  it("still places tables in a cycle", () => {
    expect(restoreOrder(["a", "b"], { a: ["b"], b: ["a"] }).sort()).toEqual(["a", "b"]);
  });
});
