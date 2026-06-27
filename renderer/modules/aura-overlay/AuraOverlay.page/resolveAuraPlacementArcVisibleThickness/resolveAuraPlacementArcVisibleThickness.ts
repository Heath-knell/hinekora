import type { CropRegion, OverlayPlacement } from "~/types";
import type { AuraSize } from "../AuraOverlay.page.utils.types";
import { clamp } from "../clamp/clamp";
import { resolveAuraArcDisplayThickness } from "../resolveAuraArcDisplayThickness/resolveAuraArcDisplayThickness";

function resolveAuraPlacementArcVisibleThickness(
  crop: CropRegion,
  placement: OverlayPlacement,
  displaySize?: AuraSize,
): number | undefined {
  if (crop.shape !== "arc" || !crop.arc) {
    return undefined;
  }

  const defaultThickness = displaySize
    ? resolveAuraArcDisplayThickness(crop, displaySize, crop.arc.thickness)
    : crop.arc.thickness;
  const visibleThickness = placement.arcVisibleThickness ?? defaultThickness;

  return clamp(
    Math.round(visibleThickness),
    1,
    displaySize
      ? Math.max(displaySize.width, displaySize.height)
      : Math.max(crop.width, crop.height),
  );
}

export { resolveAuraPlacementArcVisibleThickness };
