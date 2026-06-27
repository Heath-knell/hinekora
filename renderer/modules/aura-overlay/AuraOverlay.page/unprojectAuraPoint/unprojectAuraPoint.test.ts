import { describe, expect, it } from "vitest";

import { unprojectAuraPoint } from "./unprojectAuraPoint";

describe("unprojectAuraPoint", () => {
  it("unprojects a target viewport point into reference coordinates", () => {
    const point = unprojectAuraPoint(
      { x: 480, y: 160 / 3 },
      { width: 1920, height: 1080 },
      { width: 3440, height: 1440 },
    );

    expect(point.x).toBeCloseTo(30);
    expect(point.y).toBeCloseTo(40);
  });
});
