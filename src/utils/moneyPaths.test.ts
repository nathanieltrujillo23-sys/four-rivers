import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS, projectAll, projectPath } from "./moneyPaths";

describe("projectPath", () => {
  it("starts at the starting amount", () => {
    const p = projectPath(1000, 50, 5, 7, 3);
    expect(p[0]).toMatchObject({ year: 0, nominal: 1000, real: 1000, contributed: 1000 });
  });

  it("grows a lump sum at the effective yearly rate", () => {
    const p = projectPath(1000, 0, 10, 10, 0);
    expect(p[10].nominal).toBeCloseTo(1000 * Math.pow(1.1, 10), 6);
  });

  it("erodes buying power when the rate is below inflation", () => {
    const p = projectPath(1000, 0, 10, 0, 3);
    expect(p[10].nominal).toBeCloseTo(1000, 6);
    expect(p[10].real).toBeCloseTo(1000 / Math.pow(1.03, 10), 6);
    expect(p[10].real).toBeLessThan(800);
  });

  it("tracks what was put in, including monthly additions", () => {
    const p = projectPath(1000, 100, 10, 0, 0);
    expect(p[10].contributed).toBe(1000 + 100 * 12 * 10);
    expect(p[10].nominal).toBeCloseTo(p[10].contributed, 6);
  });

  it("ranks the three paths by rate", () => {
    const { cash, hysa, market } = projectAll(5000, 0, 20, DEFAULT_ASSUMPTIONS);
    expect(market[20].real).toBeGreaterThan(hysa[20].real);
    expect(hysa[20].real).toBeGreaterThan(cash[20].real);
    expect(cash[20].real).toBeLessThan(5000);
  });
});
