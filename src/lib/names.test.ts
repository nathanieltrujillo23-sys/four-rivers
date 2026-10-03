import { describe, expect, it } from "vitest";
import { certificateName } from "./names";

describe("certificateName", () => {
  it("prefers the full name over the preferred name", () => {
    expect(certificateName({ fullName: "Nathaniel Joseph Trujillo", displayName: "Nate" })).toBe(
      "Nathaniel Joseph Trujillo"
    );
  });
  it("falls back to the preferred name, then the email, then a generic label", () => {
    expect(certificateName({ fullName: null, displayName: "Nate" })).toBe("Nate");
    expect(certificateName({ fullName: "  ", displayName: null }, "a@b.com")).toBe("a@b.com");
    expect(certificateName({ fullName: null, displayName: null })).toBe("Four Rivers Learner");
  });
});
