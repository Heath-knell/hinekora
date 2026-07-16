import { useMemo } from "react";

import {
  buildMediaLibraryLeagueOptions,
  type MediaLibraryLeagueOption,
} from "~/renderer/modules/media-library/MediaLibrary.utils/MediaLibrary.utils";

import type { GameId } from "~/types";

interface UseMediaLibraryLeagueOptionsInput {
  catalogLeagues?: readonly string[];
  game: GameId;
  savedLeagues: readonly string[];
  selectedLeague: string;
}

function useMediaLibraryLeagueOptions({
  catalogLeagues,
  game,
  savedLeagues,
  selectedLeague,
}: UseMediaLibraryLeagueOptionsInput): MediaLibraryLeagueOption[] {
  return useMemo(
    () =>
      buildMediaLibraryLeagueOptions(
        game,
        savedLeagues,
        selectedLeague,
        catalogLeagues,
      ),
    [catalogLeagues, game, savedLeagues, selectedLeague],
  );
}

export { useMediaLibraryLeagueOptions };
