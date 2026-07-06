import { EditorActionsMenu } from "../EditorActionsMenu/EditorActionsMenu";
import { EditorClipboardStatus } from "../EditorClipboardStatus/EditorClipboardStatus";
import { EditorHelpAction } from "../EditorHelpAction/EditorHelpAction";
import { EditorProjectPicker } from "../EditorProjectPicker/EditorProjectPicker";

interface EditorPageHeaderLeagueOption {
  label: string;
  value: string;
}

interface EditorPageHeaderActionsProps {
  isClipboardBusy: boolean;
  isBookmarksVisible: boolean;
  isHistoryVisible: boolean;
  isShortcutsVisible: boolean;
  league: string;
  leagueOptions: EditorPageHeaderLeagueOption[];
  onLeagueChange: (league: string) => void;
  onToggleBookmarks: () => void;
  onToggleHistory: () => void;
  onToggleShortcuts: () => void;
}

function EditorPageHeaderActions({
  isClipboardBusy,
  isBookmarksVisible,
  isHistoryVisible,
  isShortcutsVisible,
  league,
  leagueOptions,
  onLeagueChange,
  onToggleBookmarks,
  onToggleHistory,
  onToggleShortcuts,
}: EditorPageHeaderActionsProps) {
  return (
    <>
      <EditorClipboardStatus />
      <EditorHelpAction />
      <label className="no-drag">
        <span className="sr-only">Editor media league</span>
        <select
          aria-label="Editor media league"
          className="select select-bordered select-sm h-8 w-36"
          disabled={isClipboardBusy}
          value={league}
          onChange={(event) => {
            onLeagueChange(event.currentTarget.value);
          }}
        >
          {leagueOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <EditorProjectPicker />
      <EditorActionsMenu
        isBookmarksVisible={isBookmarksVisible}
        isHistoryVisible={isHistoryVisible}
        isShortcutsVisible={isShortcutsVisible}
        onToggleBookmarks={onToggleBookmarks}
        onToggleHistory={onToggleHistory}
        onToggleShortcuts={onToggleShortcuts}
      />
    </>
  );
}

export { EditorPageHeaderActions };
