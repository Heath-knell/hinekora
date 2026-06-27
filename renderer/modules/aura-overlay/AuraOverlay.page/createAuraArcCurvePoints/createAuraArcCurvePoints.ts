import type { CropRegion } from "~/types";
import type { AuraPoint } from "../AuraOverlay.page.utils.types";
import { createAuraArcPoints } from "../createAuraArcPoints/createAuraArcPoints";

function createAuraArcCurvePoints(crop: CropRegion): AuraPoint[] {
  if (crop.shape !== "arc" || !crop.arc) {
    return [];
  }

  return createAuraArcPoints(crop.arc);
}

export { createAuraArcCurvePoints };
