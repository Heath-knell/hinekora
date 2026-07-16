import { useMediaLibraryLeagueOptions } from "../../MediaLibrary.hooks/useMediaLibraryLeagueOptions/useMediaLibraryLeagueOptions";
import { useMediaLibraryScope } from "../../MediaLibrary.hooks/useMediaLibraryScope/useMediaLibraryScope";
import { MediaLibraryLeagueSelect } from "../MediaLibraryLeagueSelect/MediaLibraryLeagueSelect";

interface MediaLibraryLeagueControlProps {
  disabled?: boolean;
  error?: string | null;
  savedLeagues: readonly string[];
}

function MediaLibraryLeagueControl({
  disabled = false,
  error = null,
  savedLeagues,
}: MediaLibraryLeagueControlProps) {
  const {
    error: catalogError,
    isFetchingLeagues,
    leagues,
    scope,
    setLeague,
  } = useMediaLibraryScope();
  const leagueOptions = useMediaLibraryLeagueOptions({
    catalogLeagues: leagues,
    game: scope.game,
    savedLeagues,
    selectedLeague: scope.league,
  });

  return (
    <MediaLibraryLeagueSelect
      ariaLabel="Library league"
      disabled={disabled}
      error={error ?? catalogError}
      isFetchingLeagues={isFetchingLeagues}
      league={scope.league}
      leagueOptions={leagueOptions}
      selectClassName="select select-bordered select-sm h-8 w-44"
      statusPlacement="before"
      onLeagueChange={setLeague}
    />
  );
}

export { MediaLibraryLeagueControl };
