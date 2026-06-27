import { describe, expect, it } from "vitest";

import { createAuraProfileUpdateFromSnapshot } from "./createAuraProfileUpdateFromSnapshot";

describe("createAuraProfileUpdateFromSnapshot", () => {
  it("creates a profile update from a history snapshot", () => {
    const snapshot = {
      cropRegions: [
        {
          id: "crop-1",
          label: "Life",
          x: 10,
          y: 20,
          width: 100,
          height: 40,
        },
      ],
      overlayPlacements: [
        {
          id: "placement-1",
          cropRegionId: "crop-1",
          x: 30,
          y: 40,
          scale: 1,
          opacity: 1,
        },
      ],
    };

    expect(createAuraProfileUpdateFromSnapshot("profile-1", snapshot)).toEqual({
      id: "profile-1",
      cropRegions: snapshot.cropRegions,
      overlayPlacements: snapshot.overlayPlacements,
    });
  });
});
