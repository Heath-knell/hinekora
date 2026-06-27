import { describe, expect, it } from "vitest";

import { resolveAuraPlacementArcVisibleThickness } from "./resolveAuraPlacementArcVisibleThickness";

describe("resolveAuraPlacementArcVisibleThickness", () => {
  it("resolves explicit visible thickness or source thickness", () => {
    const crop = {
      id: "crop-arc",
      label: "Shield",
      shape: "arc" as const,
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
    };
    const placement = {
      id: "placement-1",
      cropRegionId: "crop-arc",
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
    };

    expect(resolveAuraPlacementArcVisibleThickness(crop, placement)).toBe(20);
    expect(
      resolveAuraPlacementArcVisibleThickness(crop, {
        ...placement,
        arcVisibleThickness: 36,
      }),
    ).toBe(36);
  });
});
