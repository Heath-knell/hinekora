import { describe, expect, it } from "vitest";

import { AuraPointPlacementSettings } from "~/types";
import { resolveAuraPlacementDisplaySize } from "./resolveAuraPlacementDisplaySize";

describe("resolveAuraPlacementDisplaySize", () => {
  it("resolves pointer aura display size from sample size and point gap", () => {
    expect(
      resolveAuraPlacementDisplaySize(
        {
          id: "crop-points",
          label: "Pointer aura",
          shape: "points",
          x: 90,
          y: 90,
          width: 140,
          height: 80,
          points: [
            { x: 10, y: 10 },
            { x: 90, y: 40 },
            { x: 130, y: 70 },
          ],
        },
        {
          id: "placement-1",
          cropRegionId: "crop-points",
          x: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          pointGap: AuraPointPlacementSettings.defaultGap,
          pointSampleSize: AuraPointPlacementSettings.defaultSampleSize,
        },
        { width: 1920, height: 1080 },
      ),
    ).toEqual({ width: 20, height: 100 });
  });

  it("keeps placement scale below one at the minimum scale", () => {
    expect(
      resolveAuraPlacementDisplaySize(
        {
          id: "crop-points",
          label: "Pointer aura",
          shape: "points",
          x: 90,
          y: 90,
          width: 140,
          height: 80,
          points: [
            { x: 10, y: 10 },
            { x: 90, y: 40 },
          ],
        },
        {
          id: "placement-1",
          cropRegionId: "crop-points",
          x: 0,
          y: 0,
          scale: 0.1,
          opacity: 1,
          pointGap: AuraPointPlacementSettings.defaultGap,
          pointSampleSize: AuraPointPlacementSettings.defaultSampleSize,
        },
        { width: 1920, height: 1080 },
      ),
    ).toEqual({ width: 20, height: 60 });
  });

  it("clamps tiny persisted aura sizes to the minimum rendered dimension", () => {
    expect(
      resolveAuraPlacementDisplaySize(
        {
          id: "crop-1",
          label: "Life",
          x: 10,
          y: 20,
          width: 100,
          height: 40,
        },
        {
          id: "placement-1",
          cropRegionId: "crop-1",
          height: 1,
          opacity: 1,
          scale: 1,
          width: 1,
          x: 0,
          y: 0,
        },
        { width: 1920, height: 1080 },
      ),
    ).toEqual({ width: 10, height: 10 });
  });
});
