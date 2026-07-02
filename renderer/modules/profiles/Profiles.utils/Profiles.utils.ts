import {
  type GameId,
  getProfilesForGame,
  hasRenderableAuraPlacements,
  isProfileAvailableForGame,
  type Profile,
  resolveActiveGameProfile,
} from "~/types";

type ProfileGameScope = Profile["game"];

const profileGameOrder: Record<GameId | "all", number> = {
  all: 0,
  poe1: 1,
  poe2: 2,
};

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
