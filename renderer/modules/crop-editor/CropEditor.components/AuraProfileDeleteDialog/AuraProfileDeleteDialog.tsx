import { useEffect, useRef, useState } from "react";
import { FiAlertTriangle, FiTrash2 } from "react-icons/fi";

import { Modal, type ModalHandle } from "~/renderer/components/Modal/Modal";
import { getSelectedProfile } from "~/renderer/modules/crop-editor/CropEditor.utils/CropEditor.utils";
import {
  useCropEditorShallow,
  useProfilesShallow,
  useSettingsSelector,
} from "~/renderer/store";

function AuraProfileDeleteDialog() {
  const modalRef = useRef<ModalHandle>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { closeProfileActionDialog, profileActionDialog } =
    useCropEditorShallow((cropEditor) => ({
      closeProfileActionDialog: cropEditor.closeProfileActionDialog,
      profileActionDialog: cropEditor.profileActionDialog,
    }));
  const { deleteAllProfiles, deleteProfile, profileItems, selectedProfileId } =
    useProfilesShallow((profiles) => ({
      deleteAllProfiles: profiles.deleteAll,
      deleteProfile: profiles.delete,
      profileItems: profiles.items,
      selectedProfileId: profiles.selectedProfileId,
    }));
  const activeGame = useSettingsSelector(
    (settings) => settings.value?.activeGame ?? "poe1",
  );
  const profile = getSelectedProfile(
    profileItems,
    selectedProfileId,
    activeGame,
  );
  const isDeleteAll = profileActionDialog === "delete-all";

  useEffect(() => {
    setActionError(null);
    setIsSaving(false);
    modalRef.current?.open();
  }, []);

  const handleClose = () => {
    if (!isSaving) {
      closeProfileActionDialog();
    }
  };
  const handleConfirm = async () => {
    if (!profile || isSaving) {
      return;
    }

    setActionError(null);
    setIsSaving(true);
    try {
      if (isDeleteAll) {
        await deleteAllProfiles(profile.id);
      } else {
        await deleteProfile(profile.id);
      }
      closeProfileActionDialog();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to delete profile",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      ref={modalRef}
      className="max-w-sm rounded-lg border-error/60 p-0"
      closeOnBackdrop={!isSaving}
      closeOnEscape={!isSaving}
      surface="base-200"
      onClose={handleClose}
    >
      <div className="border-base-content/10 border-b p-4">
        <div className="flex items-center gap-3">
          <FiAlertTriangle className="h-5 w-5 shrink-0 text-error" />
          <h2 className="m-0 font-bold text-base">
            {isDeleteAll ? "Delete all profiles?" : "Delete current profile?"}
          </h2>
        </div>
        <div className="mt-2 text-base-content/60 text-sm">
          {isDeleteAll ? (
            <p className="m-0">
              All other aura profiles will be deleted.
              <span className="badge badge-outline badge-sm mx-1 align-middle font-semibold text-primary">
                {profile?.name ?? "Selected profile"}
              </span>
              will remain as an empty default available to both games.
            </p>
          ) : profileItems.length <= 1 ? (
            <p className="m-0">
              <span className="badge badge-outline badge-sm mr-1 align-middle font-semibold text-primary">
                {profile?.name ?? "Selected profile"}
              </span>
              is the final profile. It will remain, but its name, source areas,
              and aura positions will be reset.
            </p>
          ) : (
            <p className="m-0">
              <span className="badge badge-outline badge-sm mr-1 align-middle font-semibold text-primary">
                {profile?.name ?? "Selected profile"}
              </span>
              and its aura layout will be deleted.
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-2 p-4">
        <p className="m-0 font-semibold text-error text-sm">
          This action cannot be undone.
        </p>
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
          className="btn btn-error btn-sm"
          disabled={isSaving}
          type="button"
          onClick={handleConfirm}
        >
          <FiTrash2 />
          {isSaving
            ? "Deleting..."
            : isDeleteAll
              ? "Delete all profiles"
              : "Delete profile"}
        </button>
      </div>
    </Modal>
  );
}

export { AuraProfileDeleteDialog };
