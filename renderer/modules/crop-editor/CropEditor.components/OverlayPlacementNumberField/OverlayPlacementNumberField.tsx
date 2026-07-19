import clsx from "clsx";
import type { ChangeEventHandler } from "react";

import type { PlacementEditorNumberFieldConfig } from "~/renderer/modules/crop-editor/CropEditor.components/OverlayPlacementsEditor/OverlayPlacementsEditor.utils";

import type { CropRegion, OverlayPlacement } from "~/types";
import { resolvePlacementEditorNumberValue } from "../OverlayPlacementsEditor/OverlayPlacementsEditor.utils";

interface OverlayPlacementNumberFieldProps {
  className?: string;
  crop: CropRegion;
  field: PlacementEditorNumberFieldConfig;
  placement: OverlayPlacement;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

function OverlayPlacementNumberField({
  className,
  crop,
  field,
  placement,
  onChange,
}: OverlayPlacementNumberFieldProps) {
  return (
    <label
      className={clsx(
        "relative z-10 grid gap-1 text-primary text-xs",
        className,
      )}
    >
      {field.label}
      <input
        className="input input-bordered input-xs min-w-0 w-full bg-base-100/[0.01]"
        data-field={field.field}
        data-placement-id={placement.id}
        max={field.max}
        min={field.min}
        step={field.step ?? 1}
        type="number"
        value={resolvePlacementEditorNumberValue(field.field, crop, placement)}
        onChange={onChange}
      />
    </label>
  );
}

export { OverlayPlacementNumberField };
