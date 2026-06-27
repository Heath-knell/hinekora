import { describe, expect, it } from "vitest";

import { createArcControlNormal } from "./createArcControlNormal";

describe("createArcControlNormal", () => {
  it("resolves the control normal toward the selected arc side", () => {
    const normal = createArcControlNormal(
      { x: 100, y: 160 },
      { x: 220, y: 160 },
      { x: 160, y: 100 },
    );

    expect(normal.x).toBeCloseTo(0);
    expect(normal.y).toBeCloseTo(-1);
  });
});
