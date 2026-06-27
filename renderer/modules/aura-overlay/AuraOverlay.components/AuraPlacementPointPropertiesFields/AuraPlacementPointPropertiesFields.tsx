import type {
  ChangeEventHandler,
  FocusEventHandler,
  KeyboardEventHandler,
} from "react";

import { AuraPointPlacementSettings } from "~/types";
import { AuraPlacementNumberField } from "../AuraPlacementNumberField/AuraPlacementNumberField";
import type { AuraPlacementPropertiesDraft } from "../AuraPlacementPropertiesPanel/AuraPlacementPropertiesPanel.utils";

interface AuraPlacementPointPropertiesFieldsProps {
  draft: AuraPlacementPropertiesDraft;
  onBlur: FocusEventHandler<HTMLInputElement>;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onFocus: FocusEventHandler<HTMLInputElement>;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
}

function AuraPlacementPointPropertiesFields({
  draft,
  onBlur,
  onChange,
  onFocus,
  onKeyDown,
}: AuraPlacementPointPropertiesFieldsProps) {
  return (
    <>
      <AuraPlacementNumberField
        label="Thickness"
        max={String(AuraPointPlacementSettings.maxSampleSize)}
        min={String(AuraPointPlacementSettings.minSampleSize)}
        name="pointSampleSize"
        value={draft.pointSampleSize}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      />
      <AuraPlacementNumberField
        label="Spacing"
        max={String(AuraPointPlacementSettings.maxGap)}
        min={String(AuraPointPlacementSettings.minGap)}
        name="pointGap"
        value={draft.pointGap}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      />
    </>
  );
}

export { AuraPlacementPointPropertiesFields };
