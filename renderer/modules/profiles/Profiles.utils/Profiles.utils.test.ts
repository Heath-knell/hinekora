import { describe, expect, it } from "vitest";

import type { Profile } from "~/types";
import {
  formatProfileGameScope,
  getProfilesForGame,
  isProfileAvailableForGame,
  resolveActiveGameProfile,
  sortProfilesForDisplay,
} from "./Profiles.utils";

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    captureTarget: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    cropRegions: [],
    game: null,
    id: "profile-1",
    name: "PoE 1",
    overlayPlacements: [],
    targetFps: 60,
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function createRenderableProfile(overrides: Partial<Profile> = {}): Profile {
  return createProfile({
    cropRegions: [
      {
        id: "crop-1",
        label: "Life",
        x: 0,
        y: 0,
        width: 100,
        height: 40,
      },
    ],
    overlayPlacements: [
      {
        id: "placement-1",
        cropRegionId: "crop-1",
        x: 20,
        y: 20,
        scale: 1,
        opacity: 1,
      },
    ],
    ...overrides,
  });
}

describe("resolveActiveGameProfile", () => {
  it("returns global and matching game profiles", () => {
    const profiles = [
      createProfile({ id: "global" }),
      createProfile({ game: "poe1", id: "profile-1" }),
      createProfile({ game: "poe2", id: "profile-2", name: "PoE 2" }),
    ];

    expect(getProfilesForGame(profiles, "poe2")).toEqual([
      profiles[0],
      profiles[2],
    ]);
  });

  it("uses the selected profile when it is available for the active game", () => {
    const profiles = [
      createProfile({ id: "global" }),
      createProfile({ game: "poe2", id: "profile-2", name: "PoE 2" }),
    ];

    expect(resolveActiveGameProfile(profiles, "global", "poe2")).toBe(
      profiles[0],
    );
  });

  it("falls back when selected profile belongs only to another game", () => {
    const profiles = [
      createProfile({ id: "global" }),
      createProfile({ game: "poe2", id: "profile-2", name: "PoE 2" }),
    ];

    expect(resolveActiveGameProfile(profiles, "profile-2", "poe1")).toBe(
      profiles[0],
    );
  });

  it("prefers a renderable active game profile over an empty default fallback", () => {
    const emptyDefault = createProfile({
      id: "empty-default",
      name: "Default PoE 2",
    });
    const configuredProfile = createRenderableProfile({
      game: "poe2",
      id: "configured",
      name: "Configured",
    });
    const profiles = [
      emptyDefault,
      configuredProfile,
      createProfile({ game: "poe1", id: "poe1-profile" }),
    ];

    expect(resolveActiveGameProfile(profiles, "poe1-profile", "poe2")).toBe(
      configuredProfile,
    );
  });

  it("does not fall back to a game-scoped profile from another game", () => {
    const profiles = [createProfile({ game: "poe1" })];

    expect(resolveActiveGameProfile(profiles, "profile-1", "poe2")).toBeNull();
  });

  it("keeps global profiles before game-scoped profiles for stable settings rows", () => {
    const profiles = [
      createProfile({ game: "poe2", id: "poe2-b", name: "Bossing" }),
      createProfile({ game: "poe1", id: "poe1-b", name: "Mapping" }),
      createProfile({ game: null, id: "global-b", name: "Shared B" }),
      createProfile({ game: "poe2", id: "poe2-a", name: "Default PoE 2" }),
      createProfile({ game: "poe1", id: "poe1-a", name: "Default PoE 1" }),
      createProfile({ game: null, id: "global-a", name: "Shared A" }),
    ];

    expect(sortProfilesForDisplay(profiles).map(({ id }) => id)).toEqual([
      "global-a",
      "global-b",
      "poe1-a",
      "poe1-b",
      "poe2-b",
      "poe2-a",
    ]);
  });

  it("formats and checks optional game scope", () => {
    const globalProfile = createProfile({ game: null });
    const poe1Profile = createProfile({ game: "poe1" });
    const poe2Profile = createProfile({ game: "poe2" });

    expect(formatProfileGameScope(null)).toBe("All games");
    expect(formatProfileGameScope("poe1")).toBe("PoE 1");
    expect(formatProfileGameScope("poe2")).toBe("PoE 2");
    expect(isProfileAvailableForGame(globalProfile, "poe2")).toBe(true);
    expect(isProfileAvailableForGame(poe1Profile, "poe1")).toBe(true);
    expect(isProfileAvailableForGame(poe2Profile, "poe1")).toBe(false);
  });
});
