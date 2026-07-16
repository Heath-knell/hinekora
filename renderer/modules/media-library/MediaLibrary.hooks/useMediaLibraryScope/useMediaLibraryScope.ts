import { useCallback, useMemo } from "react";

import { getFallbackLeague } from "~/renderer/modules/game/GameScope.constants";
import { usePoeLeaguesShallow, useSettingsShallow } from "~/renderer/store";

import {
  type AppSettings,
  type GameId,
  getMediaLibraryLeagueSettingKey,
} from "~/types";
import type { MediaLibraryScope } from "../../MediaLibrary.utils/MediaLibrary.utils";

function getMediaLibraryLeague(
  settings: Partial<AppSettings>,
  game: GameId,
  activeLeagues: readonly string[],
): string {
  return (
    settings[getMediaLibraryLeagueSettingKey(game)] ??
    getFallbackLeague(game, activeLeagues)
  );
}

function createMediaLibraryScopeFromSettings(
  settings: Partial<AppSettings> | null,
  activeLeaguesByGame: Record<GameId, readonly string[]>,
): MediaLibraryScope {
  if (!settings) {
    return {
      game: "poe1",
      league: getFallbackLeague("poe1", activeLeaguesByGame.poe1),
    };
  }

  const activeGame = settings.activeGame ?? "poe1";
  return {
    game: activeGame,
    league: getMediaLibraryLeague(
      settings,
      activeGame,
      activeLeaguesByGame[activeGame],
    ),
  };
}

function hasMediaLibrarySettings(
  settings: Partial<AppSettings> | null,
): settings is Partial<AppSettings> & Pick<AppSettings, "activeGame"> {
  return settings?.activeGame === "poe1" || settings?.activeGame === "poe2";
}

function useMediaLibraryScope(): {
  error: string | null;
  isFetchingLeagues: boolean;
  isReady: boolean;
  leagues: readonly string[];
  scope: MediaLibraryScope;
  setLeague: (league: string) => void;
} {
  const { catalogErrors, isFetchingByGame, leaguesByGame } =
    usePoeLeaguesShallow((poeLeagues) => ({
      catalogErrors: poeLeagues.errors,
      isFetchingByGame: poeLeagues.isFetchingByGame,
      leaguesByGame: poeLeagues.byGame,
    }));
  const activeLeaguesByGame = useMemo(
    () => ({
      poe1: leaguesByGame.poe1.map((league) => league.name),
      poe2: leaguesByGame.poe2.map((league) => league.name),
    }),
    [leaguesByGame],
  );
  const { preferenceErrors, settings, updatePreference } = useSettingsShallow(
    (settingsSlice) => ({
      preferenceErrors: settingsSlice.preferenceErrors,
      settings: settingsSlice.value,
      updatePreference: settingsSlice.updatePreference,
    }),
  );
  const mediaLibrarySettings = hasMediaLibrarySettings(settings)
    ? settings
    : null;
  const scope = createMediaLibraryScopeFromSettings(
    mediaLibrarySettings,
    activeLeaguesByGame,
  );
  const leagueKey = getMediaLibraryLeagueSettingKey(scope.game);

  const setLeague = useCallback(
    (league: string) => {
      void updatePreference(leagueKey, league);
    },
    [leagueKey, updatePreference],
  );

  return {
    error: preferenceErrors[leagueKey] ?? catalogErrors[scope.game] ?? null,
    isFetchingLeagues: isFetchingByGame[scope.game],
    isReady: mediaLibrarySettings !== null,
    leagues: activeLeaguesByGame[scope.game],
    scope,
    setLeague,
  };
}

export { useMediaLibraryScope };
