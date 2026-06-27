import type { CropRegion } from "~/types";
import type { AuraSize } from "../AuraOverlay.page.utils.types";
import { createAuraArcDisplayThicknessScale } from "../createAuraArcDisplayThicknessScale/createAuraArcDisplayThicknessScale";

function resolveAuraArcDisplayThickness(
  crop: CropRegion,
  displaySize: AuraSize,
  sourceThickness: number,
): number {
  return Math.max(
    1,
    Math.round(
      sourceThickness * createAuraArcDisplayThicknessScale(crop, displaySize),
    ),
  );
}

export { resolveAuraArcDisplayThickness };
