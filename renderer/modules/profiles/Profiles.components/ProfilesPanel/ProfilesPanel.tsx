import type { ChangeEvent } from "react";

import {
  ProfileManagementPanel,
  type ProfileManagementPanelItem,
} from "~/renderer/components/ProfileManagementPanel/ProfileManagementPanel";
import {
  formatProfileGameScope,
  sortProfilesForDisplay,
} from "~/renderer/modules/profiles/Profiles.utils/Profiles.utils";
import { useProfilesShallow } from "~/renderer/store";

import type { GameId } from "~/types";

function ProfilesPanel() {
  const {
    createProfile,
    deleteProfile,
    items,
    selectedProfileId,
    selectProfile,
    updateProfile,
  } = useProfilesShallow((profiles) => ({
    createProfile: profiles.create,
    deleteProfile: profiles.delete,
    items: profiles.items,
    selectedProfileId: profiles.selectedProfileId,
    selectProfile: profiles.select,
    updateProfile: profiles.update,
  }));

  const handleCreateProfile = (name: string) => {
    void createProfile(name);
  };
  const handleSelectProfile = (profileId: string) => {
    selectProfile(profileId);
  };
  const handleDeleteProfile = (profileId: string) => {
    void deleteProfile(profileId);
  };
  function handleGameScopeChange(event: ChangeEvent<HTMLSelectElement>) {
    const profileId = event.currentTarget.dataset.profileId;
    if (!profileId) {
      return;
    }

    const value = event.currentTarget.value;
    const game = value === "all" ? null : (value as GameId);
    void updateProfile({ id: profileId, game });
  }
  const panelItems: ProfileManagementPanelItem[] = sortProfilesForDisplay(
    items,
  ).map((profile) => ({
    columns: [
      <select
        aria-label={`Game scope for ${profile.name}`}
        className="select select-bordered select-xs min-h-6 w-full max-w-[7.5rem] focus:outline-none"
        data-profile-id={profile.id}
        key={`${profile.id}-scope`}
        title={formatProfileGameScope(profile.game)}
        value={profile.game ?? "all"}
        onChange={handleGameScopeChange}
      >
        <option value="all">All games</option>
        <option value="poe1">PoE 1</option>
        <option value="poe2">PoE 2</option>
      </select>,
      `${profile.targetFps} FPS`,
    ],
    id: profile.id,
    isDeleteDisabled: items.length <= 1,
    isSelected: profile.id === selectedProfileId,
    name: profile.name,
  }));

  return (
    <ProfileManagementPanel
      count={items.length}
      emptyMessage="No profiles yet."
      initialName="Default Aura Profile"
      inputLabel="Aura profile name"
      items={panelItems}
      rowGridClassName="grid-cols-[minmax(0,1fr)_118px_72px_32px]"
      title="Aura Profiles"
      onCreate={handleCreateProfile}
      onDelete={handleDeleteProfile}
      onSelect={handleSelectProfile}
    />
  );
}

export { ProfilesPanel };
