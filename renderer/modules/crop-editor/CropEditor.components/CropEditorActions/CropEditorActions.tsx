import type { ChangeEvent } from "react";

import { AuraProfileActionDialog } from "~/renderer/modules/crop-editor/CropEditor.components/AuraProfileActionDialog/AuraProfileActionDialog";
import { AuraProfileActionsMenu } from "~/renderer/modules/crop-editor/CropEditor.components/AuraProfileActionsMenu/AuraProfileActionsMenu";
import { useAuraProfileKeyboardShortcuts } from "~/renderer/modules/crop-editor/CropEditor.hooks/useAuraProfileKeyboardShortcuts/useAuraProfileKeyboardShortcuts";
import { getSelectedProfile } from "~/renderer/modules/crop-editor/CropEditor.utils/CropEditor.utils";
import { ProfileMutationError } from "~/renderer/modules/profiles/Profiles.components/ProfileMutationError/ProfileMutationError";
import { getProfilesForGame } from "~/renderer/modules/profiles/Profiles.utils/Profiles.utils";
import { useProfilesShallow, useSettingsSelector } from "~/renderer/store";

function CropEditorActions() {
  const { profileItems, selectedProfileId, selectProfile } = useProfilesShallow(
    (profiles) => ({
      profileItems: profiles.items,
      selectedProfileId: profiles.selectedProfileId,
      selectProfile: profiles.select,
    }),
  );
  const activeGame = useSettingsSelector(
    (settings) => settings.value?.activeGame ?? "poe1",
  );
  const activeGameProfiles = getProfilesForGame(profileItems, activeGame);
  const profile = getSelectedProfile(
    profileItems,
    selectedProfileId,
    activeGame,
  );

  useAuraProfileKeyboardShortcuts();

  const handleProfileChange = (event: ChangeEvent<HTMLSelectElement>) => {
    selectProfile(event.currentTarget.value);
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <ProfileMutationError className="max-w-64" />
      <select
        aria-label="Aura profile"
        className="select select-bordered select-sm no-drag w-[min(180px,38vw)]"
        data-onboarding="aura-profile-select"
        disabled={activeGameProfiles.length === 0}
        value={profile?.id ?? ""}
        onChange={handleProfileChange}
      >
        {activeGameProfiles.length === 0 ? (
          <option value="">No profiles</option>
        ) : (
          activeGameProfiles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))
        )}
      </select>
      <AuraProfileActionsMenu />
      <AuraProfileActionDialog />
    </div>
  );
}

export { CropEditorActions };
