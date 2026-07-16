import type { ReactNode } from "react";

import { EditorActionsMenu } from "../EditorActionsMenu/EditorActionsMenu";
import { EditorClipboardStatus } from "../EditorClipboardStatus/EditorClipboardStatus";
import { EditorHelpAction } from "../EditorHelpAction/EditorHelpAction";
import { EditorProjectPicker } from "../EditorProjectPicker/EditorProjectPicker";

interface EditorPageHeaderActionsProps {
  leagueControl: ReactNode;
}

function EditorPageHeaderActions({
  leagueControl,
}: EditorPageHeaderActionsProps) {
  return (
    <>
      <EditorClipboardStatus />
      <EditorHelpAction />
      {leagueControl}
      <EditorProjectPicker />
      <EditorActionsMenu />
    </>
  );
}

export { EditorPageHeaderActions };
