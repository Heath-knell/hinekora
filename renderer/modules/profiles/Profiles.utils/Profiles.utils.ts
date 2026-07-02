import type { GameId, Profile } from "~/types";

type ProfileGameScope = Profile["game"];

const profileGameOrder: Record<GameId | "all", number> = {
  all: 0,
  poe1: 1,
  poe2: 2,
};

function getProfilesForGame(profiles: Profile[], game: GameId): Profile[] {
  return profiles.filter((profile) => isProfileAvailableForGame(profile, game));
}

function hasRenderableAuraPlacements(profile: Profile): boolean {
  const cropRegionIds = new Set(profile.cropRegions.map((crop) => crop.id));

  return profile.overlayPlacements.some((placement) =>
    cropRegionIds.has(placement.cropRegionId),
  );
}

function sortProfilesForDisplay(profiles: Profile[]): Profile[] {
  return [...profiles].sort((left, right) => {
    const gameComparison =
      profileGameOrder[getProfileGameOrderKey(left.game)] -
      profileGameOrder[getProfileGameOrderKey(right.game)];
    if (gameComparison !== 0) {
      return gameComparison;
    }

    return left.name.localeCompare(right.name);
  });
}

function resolveActiveGameProfile(
  profiles: Profile[],
  selectedProfileId: string | null,
  activeGame: GameId,
): Profile | null {
  const activeGameProfiles = getProfilesForGame(profiles, activeGame);

  return (
    (selectedProfileId
      ? activeGameProfiles.find((profile) => profile.id === selectedProfileId)
      : null) ??
    activeGameProfiles.find(hasRenderableAuraPlacements) ??
    activeGameProfiles[0] ??
    null
  );
}

function isProfileAvailableForGame(profile: Profile, game: GameId): boolean {
  return profile.game === null || profile.game === game;
}

function formatProfileGameScope(game: ProfileGameScope): string {
  if (game === null) {
    return "All games";
  }

  return game === "poe1" ? "PoE 1" : "PoE 2";
}

function getProfileGameOrderKey(game: ProfileGameScope): GameId | "all" {
  return game ?? "all";
}

export {
  formatProfileGameScope,
  getProfilesForGame,
  hasRenderableAuraPlacements,
  isProfileAvailableForGame,
  resolveActiveGameProfile,
  sortProfilesForDisplay,
};
