import { describe, expect, it } from "vitest";
import { linkedInAddToProfile } from "./linkedin";

describe("LinkedIn add-to-profile link", () => {
  it("fills in the certification form with the course, month, year and verify link", () => {
    const url = new URL(linkedInAddToProfile("2026-11-03T15:00:00Z", "abcd1234-0000-0000-0000-000000000000", "https://four-rivers.vercel.app/verify/abcd1234"));
    expect(url.origin + url.pathname).toBe("https://www.linkedin.com/profile/add");
    expect(url.searchParams.get("startTask")).toBe("CERTIFICATION_NAME");
    expect(url.searchParams.get("name")).toBe("4 Rivers: A Course in Stewardship");
    expect(url.searchParams.get("organizationName")).toBe("4 Rivers");
    expect(url.searchParams.get("issueYear")).toBe("2026");
    expect(url.searchParams.get("issueMonth")).toBe("11");
    expect(url.searchParams.get("certUrl")).toBe("https://four-rivers.vercel.app/verify/abcd1234");
    expect(url.searchParams.get("certId")).toBe("ABCD1234");
  });
});
