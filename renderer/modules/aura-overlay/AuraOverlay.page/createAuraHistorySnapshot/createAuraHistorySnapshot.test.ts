import { describe, expect, it } from "vitest";

import type { Profile } from "~/types";
import { createAuraHistorySnapshot } from "./createAuraHistorySnapshot";

const profile: Profile = {
  id: "profile-1",
  name: "Default",
  game: "poe1",
  targetFps: 30,
  captureTarget: null,
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
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe("createAuraHistorySnapshot", () => {
  it("creates cloned aura history snapshots", () => {
    const snapshot = createAuraHistorySnapshot(profile);

    expect(snapshot).toEqual({
      cropRegions: profile.cropRegions,
      overlayPlacements: profile.overlayPlacements,
    });
    expect(snapshot.cropRegions[0]).not.toBe(profile.cropRegions[0]);
    expect(snapshot.overlayPlacements[0]).not.toBe(
      profile.overlayPlacements[0],
    );
  });
});
