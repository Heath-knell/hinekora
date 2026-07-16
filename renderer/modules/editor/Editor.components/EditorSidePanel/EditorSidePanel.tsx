import { useEditorShallow } from "~/renderer/store";

import { EditorBookmarksRail } from "../EditorBookmarksRail/EditorBookmarksRail";
import { EditorHistoryRail } from "../EditorHistoryRail/EditorHistoryRail";
import { EditorShortcutsRail } from "../EditorShortcutsRail/EditorShortcutsRail";

function EditorSidePanel() {
  const visibleSidePanel = useEditorShallow(
    (editor) => editor.visibleSidePanel,
  );

  if (visibleSidePanel === "bookmarks") {
    return <EditorBookmarksRail />;
  }

  if (visibleSidePanel === "history") {
    return <EditorHistoryRail />;
  }

  if (visibleSidePanel === "shortcuts") {
    return <EditorShortcutsRail />;
  }

  return null;
}

export { EditorSidePanel };
