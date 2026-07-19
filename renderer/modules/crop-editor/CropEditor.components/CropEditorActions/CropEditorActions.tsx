import clsx from "clsx";
import type { ChangeEvent, FocusEvent, MouseEvent } from "react";
import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

import type { CropRegionSelectionShape } from "~/main/modules/overlay-windows/OverlayWindows.dto";
import { getAuraSelectionTypeHelp } from "~/renderer/modules/aura-selection/AuraSelection.utils/AuraSelection.utils";
import {
  createAuraProfileUpdateFromSelection,
  getSelectedProfile,
} from "~/renderer/modules/crop-editor/CropEditor.utils/CropEditor.utils";
import { isPoeProcessStateForGame } from "~/renderer/modules/game/GameStatusBadge/GameStatusBadge.utils";
import { getProfilesForGame } from "~/renderer/modules/profiles/Profiles.utils/Profiles.utils";
import {
  useCropEditorShallow,
  usePoeProcessSelector,
  useProfilesShallow,
  useSettingsSelector,
} from "~/renderer/store";

const addAuraActions = [
  {
    ...getAuraSelectionTypeHelp("rect"),
    label: "Add new aura",
    shape: "rect" as const,
  },
  {
    ...getAuraSelectionTypeHelp("arc"),
    label: "Add arched aura",
    shape: "arc" as const,
  },
  {
    ...getAuraSelectionTypeHelp("points"),
    label: "Add pointer aura",
    shape: "points" as const,
  },
] satisfies Array<{ label: string; shape: CropRegionSelectionShape }>;
const { Icon: AddAuraIcon } = getAuraSelectionTypeHelp("rect");

function readAddAuraShape(
  value: string | undefined,
): CropRegionSelectionShape | null {
  if (value === "rect" || value === "arc" || value === "points") {
    return value;
  }

  return null;
}

function CropEditorActions() {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAddAuraMenuOpen, setIsAddAuraMenuOpen] = useState(false);
  const { profileItems, selectedProfileId, selectProfile, updateProfile } =
    useProfilesShallow((profiles) => ({
      profileItems: profiles.items,
      selectedProfileId: profiles.selectedProfileId,
      selectProfile: profiles.select,
      updateProfile: profiles.update,
    }));
  const poeProcessState = usePoeProcessSelector(
    (poeProcess) => poeProcess.state,
  );
  const { auraOverlayLocked, selectAura, setAuraOverlayLocked } =
    useCropEditorShallow((cropEditor) => ({
      auraOverlayLocked: cropEditor.auraOverlayLocked,
      selectAura: cropEditor.selectAura,
      setAuraOverlayLocked: cropEditor.setAuraOverlayLocked,
    }));
  const activeGame = useSettingsSelector(
    (settings) => settings.value?.activeGame ?? "poe1",
  );
  const activeGameProfiles = getProfilesForGame(profileItems, activeGame);
  const profile = getSelectedProfile(
    profileItems,
    selectedProfileId,
    activeGame,
  );
  const canAddNewAura =
    profile !== null && isPoeProcessStateForGame(poeProcessState, activeGame);
  const addAuraTooltip = !profile
    ? "Create a profile first."
    : !canAddNewAura
      ? "Start the selected Path of Exile game before adding a new aura. Hinekora needs the game process to capture the source area."
      : "Capture a source area and create its aura overlay.";

  const handleProfileChange = (event: ChangeEvent<HTMLSelectElement>) => {
    selectProfile(event.currentTarget.value);
  };

  const handleAddAura = async (shape: CropRegionSelectionShape) => {
    if (!profile || !canAddNewAura) {
      return;
    }

    if (auraOverlayLocked) {
      setAuraOverlayLocked(false);
      await window.electron.overlayWindows.setAuraLocked(false);
    }

    await window.electron.mainWindow.minimize().catch(() => undefined);
    const selection = await window.electron.overlayWindows.selectCropRegion({
      shape,
    });
    if (!selection) {
      return;
    }

    const { crop, profileUpdate } = createAuraProfileUpdateFromSelection(
      profile,
      selection,
    );

    await updateProfile(profileUpdate);
    selectAura(crop.id);
    await window.electron.overlayWindows.showAura(profile.id);
  };

  const handleAddAuraActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    const shape = readAddAuraShape(event.currentTarget.dataset.shape);
    if (!shape) {
      return;
    }

    setIsAddAuraMenuOpen(false);
    setActionError(null);
    void handleAddAura(shape).catch((error) => {
      setActionError(
        error instanceof Error ? error.message : "Unable to add aura",
      );
    });
  };

  const handleAddAuraMenuBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      setIsAddAuraMenuOpen(false);
    }
  };

  const handleAddAuraTriggerClick = () => {
    setIsAddAuraMenuOpen((isOpen) => !isOpen);
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {actionError && (
        <span className="max-w-56 text-error text-xs" role="alert">
          {actionError}
        </span>
      )}
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
      <div
        className={clsx(
          "dropdown dropdown-end tooltip tooltip-left no-drag",
          canAddNewAura && "before:hidden after:hidden",
        )}
        data-tip={canAddNewAura ? "" : addAuraTooltip}
        data-onboarding="aura-new-aura"
        onBlur={handleAddAuraMenuBlur}
      >
        <button
          aria-expanded={isAddAuraMenuOpen}
          aria-haspopup="menu"
          className="btn btn-primary btn-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canAddNewAura}
          type="button"
          onClick={handleAddAuraTriggerClick}
        >
          <AddAuraIcon size={16} />
          Add aura
          <FiChevronDown size={14} />
        </button>
        {isAddAuraMenuOpen && (
          <ul
            className="dropdown-content menu z-20 mt-2 w-52 rounded-md border border-base-content/10 bg-base-200 p-1 shadow-xl"
            role="menu"
          >
            {addAuraActions.map(({ Icon, iconClassName, label, shape }) => (
              <li key={shape}>
                <button
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm"
                  data-shape={shape}
                  disabled={!canAddNewAura}
                  role="menuitem"
                  type="button"
                  onClick={handleAddAuraActionClick}
                >
                  <Icon className={iconClassName} size={16} />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export { CropEditorActions };
