import { useMemo } from "react";

import type { EditorWorkspace } from "~/main/modules/editor";
import { useMediaLibraryLeagueOptions } from "~/renderer/modules/media-library/MediaLibrary.hooks/useMediaLibraryLeagueOptions/useMediaLibraryLeagueOptions";
import type {
  MediaLibraryLeagueOption,
  MediaLibraryScope,
} from "~/renderer/modules/media-library/MediaLibrary.utils/MediaLibrary.utils";

interface UseEditorMediaLeagueOptionsInput {
  catalogLeagues: readonly string[];
  savedEditAvailableLeagues: readonly string[];
  scope: MediaLibraryScope;
  workspace: EditorWorkspace | null;
}

function useEditorMediaLeagueOptions({
  catalogLeagues,
  savedEditAvailableLeagues,
  scope,
  workspace,
}: UseEditorMediaLeagueOptionsInput): MediaLibraryLeagueOption[] {
  const availableLeagues = useMemo(() => {
    const mediaLeagues =
      workspace?.assets
        .filter((asset) => asset.sourceGame === scope.game)
        .map((asset) => asset.sourceLeague) ?? [];

    return [...mediaLeagues, ...savedEditAvailableLeagues];
  }, [savedEditAvailableLeagues, scope.game, workspace?.assets]);

  return useMediaLibraryLeagueOptions({
    catalogLeagues,
    game: scope.game,
    savedLeagues: availableLeagues,
    selectedLeague: scope.league,
  });
}

export { useEditorMediaLeagueOptions };
