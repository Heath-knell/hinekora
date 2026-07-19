import { type FocusEvent, type MouseEvent, useEffect, useRef } from "react";
import { FiChevronDown } from "react-icons/fi";

import { ShortcutCombo } from "~/renderer/components/ShortcutCombo/ShortcutCombo";
import { useAuraProfileSave } from "~/renderer/modules/crop-editor/CropEditor.hooks/useAuraProfileSave/useAuraProfileSave";
import { getSelectedProfile } from "~/renderer/modules/crop-editor/CropEditor.utils/CropEditor.utils";
import {
  useCropEditorShallow,
  useProfilesShallow,
  useSettingsSelector,
} from "~/renderer/store";

function AuraProfileActionsMenu() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const { openProfileActionDialog } = useCropEditorShallow((cropEditor) => ({
    openProfileActionDialog: cropEditor.openProfileActionDialog,
  }));
  const { profileItems, selectedProfileId } = useProfilesShallow(
    (profiles) => ({
      profileItems: profiles.items,
      selectedProfileId: profiles.selectedProfileId,
    }),
  );
  const activeGame = useSettingsSelector(
    (settings) => settings.value?.activeGame ?? "poe1",
  );
  const profile = getSelectedProfile(
    profileItems,
    selectedProfileId,
    activeGame,
  );
  const saveProfile = useAuraProfileSave(profile?.id ?? null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !detailsRef.current?.contains(event.target)
      ) {
        detailsRef.current?.removeAttribute("open");
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.removeAttribute("open");
        detailsRef.current.querySelector("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleMenuClick = (event: MouseEvent<HTMLUListElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest("button") instanceof HTMLButtonElement
    ) {
      detailsRef.current?.removeAttribute("open");
    }
  };
  const handleMenuBlur = (event: FocusEvent<HTMLDetailsElement>) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      detailsRef.current?.removeAttribute("open");
    }
  };
  const handleCreate = () => openProfileActionDialog("create");
  const handleEdit = () => openProfileActionDialog("edit");
  const handleDuplicate = () => openProfileActionDialog("duplicate");
  const handleDeleteCurrent = () => openProfileActionDialog("delete-current");
  const handleDeleteAll = () => openProfileActionDialog("delete-all");

  return (
    <details
      className="dropdown dropdown-end no-drag"
      ref={detailsRef}
      onBlur={handleMenuBlur}
    >
      <summary className="btn btn-primary btn-sm list-none [&::-webkit-details-marker]:hidden">
        Profile actions
        <FiChevronDown size={14} />
      </summary>
      <ul
        className="dropdown-content z-50 mt-1 grid w-64 list-none gap-1 rounded-box border border-base-content/10 bg-base-200 p-2 shadow-lg"
        onClick={handleMenuClick}
      >
        <li className="list-none">
          <button
            className="flex h-8 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm transition-colors hover:bg-base-300 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!profile}
            type="button"
            onClick={saveProfile}
          >
            Save changes
            <ShortcutCombo keys={["Ctrl", "S"]} />
          </button>
        </li>
        <li aria-hidden="true" className="list-none py-1">
          <div className="h-px w-full bg-base-content/10" />
        </li>
        <li className="list-none">
          <button
            className="flex h-8 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm transition-colors hover:bg-base-300"
            type="button"
            onClick={handleCreate}
          >
            Add new profile
            <ShortcutCombo keys={["Ctrl", "N"]} />
          </button>
        </li>
        <li className="list-none">
          <button
            className="flex h-8 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm transition-colors hover:bg-base-300 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!profile}
            type="button"
            onClick={handleEdit}
          >
            Edit current profile
            <ShortcutCombo keys={["Ctrl", "E"]} />
          </button>
        </li>
        <li className="list-none">
          <button
            className="flex h-8 w-full items-center rounded-md px-3 text-left text-sm transition-colors hover:bg-base-300 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!profile}
            type="button"
            onClick={handleDuplicate}
          >
            Duplicate profile
          </button>
        </li>
        <li aria-hidden="true" className="list-none py-1">
          <div className="h-px w-full bg-base-content/10" />
        </li>
        <li className="list-none">
          <button
            className="flex h-8 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-red-400 text-sm transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!profile}
            type="button"
            onClick={handleDeleteCurrent}
          >
            Delete current profile
            <ShortcutCombo keys={["Ctrl", "D"]} />
          </button>
        </li>
        <li className="list-none">
          <button
            className="flex h-8 w-full items-center rounded-md px-3 text-left text-red-400 text-sm transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!profile}
            type="button"
            onClick={handleDeleteAll}
          >
            Delete all profiles
          </button>
        </li>
      </ul>
    </details>
  );
}

export { AuraProfileActionsMenu };
