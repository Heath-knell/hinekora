import { describe, expect, it } from "vitest";

import { createAuraArcBoundaryPaths } from "./createAuraArcBoundaryPaths";

describe("createAuraArcBoundaryPaths", () => {
  it("creates inner and outer boundary paths for arched aura crops", () => {
    expect(
      createAuraArcBoundaryPaths({
        id: "crop-arc",
        label: "Arched aura",
        shape: "arc",
        x: 90,
        y: 90,
        width: 140,
        height: 80,
        arc: {
          startX: 10,
          startY: 70,
          endX: 130,
          endY: 70,
          controlX: 70,
          controlY: 10,
          thickness: 20,
        },
      }),
    ).toMatchObject({
      inner: expect.stringMatching(/^M /),
      outer: expect.stringMatching(/^M /),
    });
  });

  it("returns null for non-arc crops", () => {
    expect(
      createAuraArcBoundaryPaths({
        id: "crop-1",
        label: "Life",
        x: 10,
        y: 20,
        width: 100,
        height: 40,
      }),
    ).toBeNull();
  });
});
