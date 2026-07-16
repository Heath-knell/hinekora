import { useEditorMediaLeagueOptions } from "~/renderer/modules/editor/Editor.hooks/useEditorMediaLeagueOptions/useEditorMediaLeagueOptions";
import { MediaLibraryLeagueSelect } from "~/renderer/modules/media-library/MediaLibrary.components/MediaLibraryLeagueSelect/MediaLibraryLeagueSelect";
import { useMediaLibraryScope } from "~/renderer/modules/media-library/MediaLibrary.hooks/useMediaLibraryScope/useMediaLibraryScope";
import { useEditorShallow, useSavedEditsShallow } from "~/renderer/store";

interface EditorMediaLeagueControlProps {
  disabled: boolean;
}

function EditorMediaLeagueControl({ disabled }: EditorMediaLeagueControlProps) {
  const { error, isFetchingLeagues, leagues, scope, setLeague } =
    useMediaLibraryScope();
  const workspace = useEditorShallow((editor) => editor.workspace);
  const savedEditAvailableLeagues = useSavedEditsShallow(
    (savedEdits) => savedEdits.libraryPage?.availableLeagues ?? [],
  );
  const leagueOptions = useEditorMediaLeagueOptions({
    catalogLeagues: leagues,
    savedEditAvailableLeagues,
    scope,
    workspace,
  });

  return (
    <MediaLibraryLeagueSelect
      ariaLabel="Editor media league"
      disabled={disabled}
      error={error}
      isFetchingLeagues={isFetchingLeagues}
      league={scope.league}
      leagueOptions={leagueOptions}
      selectClassName="select select-bordered select-sm h-8 w-36"
      onLeagueChange={setLeague}
    />
  );
}

export { EditorMediaLeagueControl };
