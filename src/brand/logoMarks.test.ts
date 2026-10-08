import { describe, expect, it } from "vitest";
import { LOGO_IDS, LOGOS, logoSvg } from "./logoMarks.mjs";

describe("logo marks", () => {
  it("draws every logo, with a name and a note", () => {
    for (const id of LOGO_IDS) {
      expect(LOGOS[id].name.length).toBeGreaterThan(2);
      const svg = logoSvg(id, { size: 40 });
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain('width="40"');
      expect(svg.endsWith("</svg>")).toBe(true);
    }
  });

  it("keeps clip-path ids apart when two marks share a page", () => {
    const a = logoSvg("droplet", { uid: "a" });
    const b = logoSvg("droplet", { uid: "b" });
    expect(a).toContain('id="a"');
    expect(b).toContain('id="b"');
    expect(a).not.toContain('id="b"');
  });

  it("falls back to the original mark for an unknown id", () => {
    expect(logoSvg("nope")).toBe(logoSvg("current"));
  });
});
