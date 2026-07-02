import type { GameId, Profile } from "./schemas";

function isProfileAvailableForGame(profile: Profile, game: GameId): boolean {
  return profile.game === null || profile.game === game;
}

function getProfilesForGame(profiles: Profile[], game: GameId): Profile[] {
  return profiles.filter((profile) => isProfileAvailableForGame(profile, game));
}

function hasRenderableAuraPlacements(profile: Profile): boolean {
  const cropRegionIds = new Set(profile.cropRegions.map((crop) => crop.id));

  return profile.overlayPlacements.some((placement) =>
    cropRegionIds.has(placement.cropRegionId),
  );
}

function resolveRenderableProfileForGame(
  profiles: Profile[],
  game: GameId,
): Profile | null {
  return (
    getProfilesForGame(profiles, game).find(hasRenderableAuraPlacements) ?? null
  );
}

function resolveActiveGameProfile(
  profiles: Profile[],
  selectedProfileId: string | null | undefined,
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

export {
  getProfilesForGame,
  hasRenderableAuraPlacements,
  isProfileAvailableForGame,
  resolveActiveGameProfile,
  resolveRenderableProfileForGame,
};
