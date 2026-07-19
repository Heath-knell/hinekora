import type { ChangeEvent } from "react";

import { AuraCropThumbnailBackground } from "~/renderer/modules/crop-editor/CropEditor.components/AuraCropThumbnailBackground/AuraCropThumbnailBackground";
import { OverlayPlacementNumberField } from "~/renderer/modules/crop-editor/CropEditor.components/OverlayPlacementNumberField/OverlayPlacementNumberField";
import {
  getSelectedProfile,
  resolveActiveAuraCropRegionId,
} from "~/renderer/modules/crop-editor/CropEditor.utils/CropEditor.utils";
import {
  useCropEditorShallow,
  useProfilesShallow,
  useSettingsSelector,
} from "~/renderer/store";

import {
  auraRotationDegrees,
  createPlacementEditorNumberPatch,
  createPlacementPositionNumberFields,
  createPlacementScaleNumberFields,
  createPlacementSecondaryNumberFields,
  createPlacementToggleFields,
  getPlacementOpacityNumberField,
  getPlacementToggleLabel,
  isPlacementEditorNumberField,
  isPlacementEditorToggleField,
  normalizePlacementEditorNumberValue,
  readAuraRotationDegrees,
} from "./OverlayPlacementsEditor.utils";

function OverlayPlacementsEditor() {
  const { profileItems, selectedProfileId, updateProfileFromCurrent } =
    useProfilesShallow((profiles) => ({
      profileItems: profiles.items,
      selectedProfileId: profiles.selectedProfileId,
      updateProfileFromCurrent: profiles.updateFromCurrent,
    }));
  const selectedAuraCropRegionId = useCropEditorShallow(
    (cropEditor) => cropEditor.selectedAuraCropRegionId,
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
  const activePlacements =
    profile?.overlayPlacements.filter(
      (placement) => placement.cropRegionId === activeAuraCropRegionId,
    ) ?? [];
  const cropRegionsById = new Map(
    profile?.cropRegions.map((region) => [region.id, region] as const) ?? [],
  );
  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!profile) {
      return;
    }
    const placementId = event.currentTarget.dataset.placementId;
    const field = event.currentTarget.dataset.field;
    if (!placementId || !isPlacementEditorNumberField(field)) {
      return;
    }
    const normalized = normalizePlacementEditorNumberValue(
      field,
      event.currentTarget.value,
    );
    if (normalized === null) {
      return;
    }
    const patch = createPlacementEditorNumberPatch(field, normalized);

    void updateProfileFromCurrent(profile.id, (currentProfile) => ({
      overlayPlacements: currentProfile.overlayPlacements.map((placement) =>
        placement.id === placementId ? { ...placement, ...patch } : placement,
      ),
    })).catch(() => undefined);
  };

  const handleToggleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!profile) {
      return;
    }

    const placementId = event.currentTarget.dataset.placementId;
    const field = event.currentTarget.dataset.field;
    if (!placementId || !isPlacementEditorToggleField(field)) {
      return;
    }

    const checked = event.currentTarget.checked;
    void updateProfileFromCurrent(profile.id, (currentProfile) => ({
      overlayPlacements: currentProfile.overlayPlacements.map((placement) =>
        placement.id === placementId
          ? { ...placement, [field]: checked }
          : placement,
      ),
    })).catch(() => undefined);
  };

  const handleRotationChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!profile) {
      return;
    }

    const placementId = event.currentTarget.dataset.placementId;
    const rotationDegrees = readAuraRotationDegrees(event.currentTarget.value);
    if (!placementId || rotationDegrees === null) {
      return;
    }

    void updateProfileFromCurrent(profile.id, (currentProfile) => ({
      overlayPlacements: currentProfile.overlayPlacements.map((placement) =>
        placement.id === placementId
          ? { ...placement, rotationDegrees }
          : placement,
      ),
    })).catch(() => undefined);
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="grid content-start gap-2">
      {activePlacements.map((placement) => {
        const crop = cropRegionsById.get(placement.cropRegionId);
        if (!crop) {
          return null;
        }
        const positionNumberFields = createPlacementPositionNumberFields();
        const scaleNumberFields = createPlacementScaleNumberFields(crop);
        const opacityNumberField = getPlacementOpacityNumberField();
        const secondaryNumberFields =
          createPlacementSecondaryNumberFields(crop);
        const toggleFields = createPlacementToggleFields(crop);

        return (
          <div
            className="relative isolate grid grid-cols-2 items-end gap-2 overflow-hidden rounded-md bg-base-200 p-2"
            key={placement.id}
          >
            <AuraCropThumbnailBackground
              className="right-[10px] bottom-[10px] z-0 size-16 rounded-md opacity-10"
              crop={crop}
            />
            <h3 className="relative z-10 col-span-2 m-0 font-bold text-primary text-xs">
              Aura Position
            </h3>
            {positionNumberFields.map((field) => (
              <OverlayPlacementNumberField
                crop={crop}
                field={field}
                key={field.field}
                placement={placement}
                onChange={handleNumberChange}
              />
            ))}
            {scaleNumberFields.map((field) => (
              <OverlayPlacementNumberField
                crop={crop}
                field={field}
                key={field.field}
                placement={placement}
                onChange={handleNumberChange}
              />
            ))}
            <OverlayPlacementNumberField
              className="col-start-1"
              crop={crop}
              field={opacityNumberField}
              placement={placement}
              onChange={handleNumberChange}
            />
            <label className="relative z-10 grid gap-1 text-primary text-xs">
              Rotation
              <select
                className="select select-bordered select-xs min-w-0 w-full bg-base-100/[0.01]"
                data-placement-id={placement.id}
                value={placement.rotationDegrees ?? 0}
                onChange={handleRotationChange}
              >
                {auraRotationDegrees.map((rotationDegrees) => (
                  <option key={rotationDegrees} value={rotationDegrees}>
                    {rotationDegrees}deg
                  </option>
                ))}
              </select>
            </label>
            {secondaryNumberFields.map((field) => (
              <OverlayPlacementNumberField
                crop={crop}
                field={field}
                key={field.field}
                placement={placement}
                onChange={handleNumberChange}
              />
            ))}
            {toggleFields.map((field) => (
              <label
                className="relative z-10 mt-1 flex items-center gap-2 text-primary text-xs"
                key={field}
              >
                <input
                  checked={placement[field] === true}
                  className="checkbox checkbox-primary checkbox-xs"
                  data-field={field}
                  data-placement-id={placement.id}
                  type="checkbox"
                  onChange={handleToggleChange}
                />
                {getPlacementToggleLabel(field)}
              </label>
            ))}
          </div>
        );
      })}
      {activePlacements.length === 0 && (
        <p className="m-0 text-base-content/60 text-xs">
          No aura position configured.
        </p>
      )}
    </div>
  );
}

export { OverlayPlacementsEditor };
