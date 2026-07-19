import { describe, expect, it } from "vitest";

import { createPlacementPropertiesUpdate } from "./useAuraOverlayPlacementEditor.utils";

describe("useAuraOverlayPlacementEditor utils", () => {
  it("updates crop labels and placement opacity from property patches", () => {
    const result = createPlacementPropertiesUpdate(
      {
        cropRegionId: "crop-1",
        id: "placement-1",
        opacity: 1,
        scale: 1,
        x: 10,
        y: 20,
      },
      {
        height: 80,
        id: "crop-1",
        label: "Aura",
        width: 120,
        x: 100,
        y: 120,
      },
      {
        label: " Renamed aura ",
        opacity: 0.45,
      },
      { width: 1920, height: 1080 },
      null,
    );

    expect(result.crop.label).toBe("Renamed aura");
    expect(result.placement.opacity).toBe(0.45);
  });
});
