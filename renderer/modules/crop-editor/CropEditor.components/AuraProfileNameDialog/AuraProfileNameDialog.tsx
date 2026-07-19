import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Modal, type ModalHandle } from "~/renderer/components/Modal/Modal";
import { getSelectedProfile } from "~/renderer/modules/crop-editor/CropEditor.utils/CropEditor.utils";
import { getProfilesForGame } from "~/renderer/modules/profiles/Profiles.utils/Profiles.utils";
import {
  useCropEditorShallow,
  useProfilesShallow,
  useSettingsSelector,
} from "~/renderer/store";

import { AuraProfileNameSettings, type Profile } from "~/types";

function AuraProfileNameDialog() {
  const modalRef = useRef<ModalHandle>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { closeProfileActionDialog, profileActionDialog } =
    useCropEditorShallow((cropEditor) => ({
      closeProfileActionDialog: cropEditor.closeProfileActionDialog,
      profileActionDialog: cropEditor.profileActionDialog,
    }));
  const {
    createProfile,
    duplicateProfile,
    profileItems,
    selectedProfileId,
    updateProfile,
  } = useProfilesShallow((profiles) => ({
    createProfile: profiles.create,
    duplicateProfile: profiles.duplicate,
    profileItems: profiles.items,
    selectedProfileId: profiles.selectedProfileId,
    updateProfile: profiles.update,
  }));
  const activeGame = useSettingsSelector(
    (settings) => settings.value?.activeGame ?? "poe1",
  );
  const activeGameProfiles = useMemo(
    () => getProfilesForGame(profileItems, activeGame),
    [activeGame, profileItems],
  );
  const profile = getSelectedProfile(
    profileItems,
    selectedProfileId,
    activeGame,
  );
  const isDuplicateMode = profileActionDialog === "duplicate";
  const isGameScopeEditable =
    profileActionDialog === "create" || profileActionDialog === "edit";
  const initialSourceProfile = profile ?? activeGameProfiles[0] ?? null;
  const [name, setName] = useState(() => {
    if (profileActionDialog === "create") {
      return "New Aura Profile";
    }
    if (profileActionDialog === "edit") {
      return profile?.name ?? "";
    }

    return initialSourceProfile
      ? `${initialSourceProfile.name} Copy`.slice(
          0,
          AuraProfileNameSettings.maxLength,
        )
      : "";
  });
  const [sourceProfileId, setSourceProfileId] = useState(
    initialSourceProfile?.id ?? "",
  );
  const [game, setGame] = useState<Profile["game"]>(() =>
    profileActionDialog === "edit" ? (profile?.game ?? null) : null,
  );
  const dialogTitle =
    profileActionDialog === "create"
      ? "Add new profile"
      : profileActionDialog === "edit"
        ? "Edit current profile"
        : "Duplicate profile";

  useEffect(() => {
    modalRef.current?.open();
  }, []);

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.currentTarget.value);
  };
  const handleSourceProfileChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSourceId = event.currentTarget.value;
    const source = activeGameProfiles.find((item) => item.id === nextSourceId);
    setSourceProfileId(nextSourceId);
    if (source) {
      setName(
        `${source.name} Copy`.slice(0, AuraProfileNameSettings.maxLength),
      );
    }
  };
  const handleGameScopeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value;
    setGame(value === "poe1" || value === "poe2" ? value : null);
  };
  const handleClose = () => {
    if (!isSaving) {
      closeProfileActionDialog();
    }
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSaving) {
      return;
    }

    setActionError(null);
    setIsSaving(true);
    try {
      if (profileActionDialog === "create") {
        await createProfile(trimmedName, game);
      } else if (profileActionDialog === "edit" && profile) {
        await updateProfile({ id: profile.id, game, name: trimmedName });
      } else if (profileActionDialog === "duplicate" && sourceProfileId) {
        await duplicateProfile(sourceProfileId, trimmedName);
      }
      closeProfileActionDialog();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update profile",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      ref={modalRef}
      className="max-w-sm rounded-lg border-base-content/10 p-0"
      closeOnBackdrop={!isSaving}
      closeOnEscape={!isSaving}
      surface="base-200"
      onClose={handleClose}
    >
      <div className="border-base-content/10 border-b p-4">
        <h2 className="m-0 font-bold text-base">{dialogTitle}</h2>
        <p className="m-0 mt-1 text-base-content/60 text-sm">
          {profileActionDialog === "create"
            ? "Create an empty aura profile."
            : profileActionDialog === "edit"
              ? "Rename the selected aura profile."
              : "Choose a saved aura profile to copy into a new profile."}
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid gap-3 p-4">
          {isDuplicateMode && (
            <label className="form-control gap-1">
              <span className="label-text text-base-content/70 text-xs">
                Existing profile
              </span>
              <select
                className="select select-bordered select-sm"
                disabled={isSaving}
                required
                value={sourceProfileId}
                onChange={handleSourceProfileChange}
              >
                {activeGameProfiles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {isGameScopeEditable && (
            <label className="form-control gap-1">
              <span className="label-text text-base-content/70 text-xs">
                Game availability
              </span>
              <select
                className="select select-bordered select-sm"
                disabled={isSaving}
                value={game ?? "all"}
                onChange={handleGameScopeChange}
              >
                <option value="all">Both games</option>
                <option value="poe1">Path of Exile 1</option>
                <option value="poe2">Path of Exile 2</option>
              </select>
            </label>
          )}
          <label className="form-control gap-1">
            <span className="label-text text-base-content/70 text-xs">
              Profile name
            </span>
            <input
              autoFocus
              className="input input-bordered input-sm"
              disabled={isSaving}
              maxLength={AuraProfileNameSettings.maxLength}
              required
              type="text"
              value={name}
              onChange={handleNameChange}
            />
          </label>
          {actionError && (
            <p className="m-0 text-error text-sm" role="alert">
              {actionError}
            </p>
          )}
        </div>
        <div className="modal-action border-base-content/10 border-t p-4">
          <button
            className="btn btn-ghost btn-sm"
            disabled={isSaving}
            type="button"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={
              isSaving || !name.trim() || (isDuplicateMode && !sourceProfileId)
            }
            type="submit"
          >
            {isSaving
              ? "Saving..."
              : profileActionDialog === "create"
                ? "Add profile"
                : isDuplicateMode
                  ? "Duplicate profile"
                  : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export { AuraProfileNameDialog };
