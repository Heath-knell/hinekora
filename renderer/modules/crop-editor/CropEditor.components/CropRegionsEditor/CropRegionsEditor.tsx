import type { ChangeEvent, FocusEvent, MouseEvent } from "react";
import { useEffect, useState } from "react";
import { FiTrash2 as Trash2 } from "react-icons/fi";

import {
  type CropNumberField,
  clamp,
  cropNumberFields,
  getSelectedProfile,
  isCropNumberField,
  resolveActiveAuraCropRegionId,
} from "~/renderer/modules/crop-editor/CropEditor.utils/CropEditor.utils";
import {
  useCropEditorShallow,
  useProfilesShallow,
  useSettingsSelector,
} from "~/renderer/store";

import { AuraLabelSettings } from "~/types";

const cropFieldLabels: Record<CropNumberField, string> = {
  x: "Screen X",
  y: "Screen Y",
  width: "Width",
  height: "Height",
};

function CropRegionsEditor() {
  const {
    profileItems,
    selectedProfileId,
    updateProfile,
    updateProfileFromCurrent,
  } = useProfilesShallow((profiles) => ({
    profileItems: profiles.items,
    selectedProfileId: profiles.selectedProfileId,
    updateProfile: profiles.update,
    updateProfileFromCurrent: profiles.updateFromCurrent,
  }));
  const { selectAura, selectedAuraCropRegionId } = useCropEditorShallow(
    (cropEditor) => ({
      selectAura: cropEditor.selectAura,
      selectedAuraCropRegionId: cropEditor.selectedAuraCropRegionId,
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
  const activeAuraCropRegionId = resolveActiveAuraCropRegionId(
    profile,
    selectedAuraCropRegionId,
  );
  const activeRegions =
    profile && activeAuraCropRegionId
      ? profile.cropRegions.filter(
          (region) => region.id === activeAuraCropRegionId,
        )
      : [];
  const activeRegion = activeRegions[0] ?? null;
  const [labelDraft, setLabelDraft] = useState(activeRegion?.label ?? "");
  useEffect(() => {
    setLabelDraft(activeRegion?.label ?? "");
  }, [activeRegion?.label]);

  const handleLabelDraftChange = (event: ChangeEvent<HTMLInputElement>) => {
    setLabelDraft(event.currentTarget.value);
  };

  const handleLabelBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (!profile) {
      return;
    }

    const regionId = event.currentTarget.dataset.regionId;
    const label = event.currentTarget.value
      .trim()
      .slice(0, AuraLabelSettings.maxLength);
    if (!regionId || label.length === 0) {
      setLabelDraft(activeRegion?.label ?? "");
      return;
    }

    void updateProfileFromCurrent(profile.id, (currentProfile) => ({
      cropRegions: currentProfile.cropRegions.map((region) =>
        region.id === regionId ? { ...region, label } : region,
      ),
    })).catch(() => undefined);
  };

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!profile) {
      return;
    }

    const regionId = event.currentTarget.dataset.regionId;
    const field = event.currentTarget.dataset.field;
    const nextValue = Number(event.currentTarget.value);
    if (!regionId || !isCropNumberField(field) || !Number.isFinite(nextValue)) {
      return;
    }

    const minimum = field === "width" || field === "height" ? 1 : 0;
    void updateProfileFromCurrent(profile.id, (currentProfile) => ({
      cropRegions: currentProfile.cropRegions.map((region) =>
        region.id === regionId
          ? {
              ...region,
              [field]: clamp(Math.round(nextValue), minimum, 100_000),
            }
          : region,
      ),
    })).catch(() => undefined);
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    if (!profile) {
      return;
    }

    const regionId = event.currentTarget.dataset.regionId;
    if (!regionId) {
      return;
    }

    const cropRegions = profile.cropRegions.filter(
      (region) => region.id !== regionId,
    );
    void updateProfile({
      id: profile.id,
      cropRegions,
      overlayPlacements: profile.overlayPlacements.filter(
        (placement) => placement.cropRegionId !== regionId,
      ),
    }).catch(() => undefined);
    selectAura(cropRegions[0]?.id ?? null);
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="grid content-start gap-2">
      {activeRegions.map((region) => (
        <div
          className="relative isolate grid grid-cols-2 items-end gap-2 overflow-hidden rounded-md bg-base-200 p-2"
          key={region.id}
        >
          <div className="relative z-10 col-span-2 flex items-center justify-between gap-2">
            <h3 className="m-0 font-bold text-primary text-xs">Source Area</h3>
            <button
              aria-label="Delete source area"
              className="btn btn-primary btn-square btn-xs"
              data-region-id={region.id}
              title="Delete source area"
              type="button"
              onClick={handleDelete}
            >
              <Trash2 size={14} />
            </button>
          </div>
          <label className="relative z-10 col-span-2 grid gap-1 text-primary text-xs">
            Name
            <input
              className="input input-bordered input-xs min-w-0 w-full bg-base-100/[0.01]"
              data-region-id={region.id}
              maxLength={AuraLabelSettings.maxLength}
              value={labelDraft}
              onChange={handleLabelDraftChange}
              onBlur={handleLabelBlur}
            />
          </label>
          {cropNumberFields.map((field) => (
            <label
              className="relative z-10 grid gap-1 text-primary text-xs"
              key={field}
            >
              {cropFieldLabels[field]}
              <input
                className="input input-bordered input-xs min-w-0 w-full bg-base-100/[0.01]"
                data-field={field}
                data-region-id={region.id}
                min={field === "width" || field === "height" ? 1 : 0}
                type="number"
                value={region[field]}
                onChange={handleNumberChange}
              />
            </label>
          ))}
        </div>
      ))}
      {profile.cropRegions.length === 0 && (
        <p className="m-0 text-base-content/60 text-xs">
          No source area configured.
        </p>
      )}
    </div>
  );
}

export { CropRegionsEditor };
