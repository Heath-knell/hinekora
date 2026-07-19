import { useCropEditorShallow } from "~/renderer/store";

import { AuraProfileDeleteDialog } from "../AuraProfileDeleteDialog/AuraProfileDeleteDialog";
import { AuraProfileNameDialog } from "../AuraProfileNameDialog/AuraProfileNameDialog";

function AuraProfileActionDialog() {
  const profileActionDialog = useCropEditorShallow(
    (cropEditor) => cropEditor.profileActionDialog,
  );

  if (
    profileActionDialog === "delete-current" ||
    profileActionDialog === "delete-all"
  ) {
    return <AuraProfileDeleteDialog />;
  }

  if (profileActionDialog) {
    return <AuraProfileNameDialog />;
  }

  return null;
}

export { AuraProfileActionDialog };
