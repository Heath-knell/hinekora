import { describe, expect, it } from "vitest";

import type { Profile } from "~/types";
import { createAuraProfileUpdateDeletingPlacement } from "./createAuraProfileUpdateDeletingPlacement";

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
    {
      id: "crop-2",
      label: "Mana",
      x: 200,
      y: 220,
      width: 80,
      height: 36,
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
    {
      id: "placement-2",
      cropRegionId: "crop-2",
      x: 300,
      y: 340,
      scale: 1,
      opacity: 0.8,
    },
  ],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe("createAuraProfileUpdateDeletingPlacement", () => {
  it("deletes the selected aura crop and every placement that uses it", () => {
    expect(
      createAuraProfileUpdateDeletingPlacement(profile, "placement-1"),
    ).toEqual({
      id: "profile-1",
      cropRegions: [profile.cropRegions[1]],
      overlayPlacements: [profile.overlayPlacements[1]],
    });
    expect(
      createAuraProfileUpdateDeletingPlacement(profile, "missing"),
    ).toBeNull();
  });
});
