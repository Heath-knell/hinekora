import type { CropRegion } from "~/types";
import type { AuraSize } from "../AuraOverlay.page.utils.types";
import { createAuraArcDisplayThicknessScale } from "../createAuraArcDisplayThicknessScale/createAuraArcDisplayThicknessScale";

function resolveAuraArcSourceThickness(
  crop: CropRegion,
  displaySize: AuraSize,
  displayThickness: number,
): number {
  return Math.max(
    1,
    Math.round(
      displayThickness / createAuraArcDisplayThicknessScale(crop, displaySize),
    ),
  );
}

export { resolveAuraArcSourceThickness };
