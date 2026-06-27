import { describe, expect, it } from "vitest";

import { projectAuraBox } from "./projectAuraBox";

describe("projectAuraBox", () => {
  it("projects a box into the target viewport", () => {
    const projectedBox = projectAuraBox(
      { x: 30, y: 40, width: 100, height: 40 },
      { width: 1920, height: 1080 },
      { width: 3440, height: 1440 },
    );

    expect(projectedBox.x).toBeCloseTo(480);
    expect(projectedBox.y).toBeCloseTo(160 / 3);
    expect(projectedBox.width).toBeCloseTo(400 / 3);
    expect(projectedBox.height).toBeCloseTo(160 / 3);
  });
});
