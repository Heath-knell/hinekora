import type { CropRegion } from "~/types";
import { createArcBoundaryPoints } from "../../AuraOverlay.utils/AuraOverlay.utils";
import type {
  AuraArcBoundaryPoints,
  AuraSize,
} from "../AuraOverlay.page.utils.types";
import { createAuraArcBoundaryInput } from "../createAuraArcBoundaryInput/createAuraArcBoundaryInput";

function createAuraArcBoundaryPoints(
  crop: CropRegion,
  visibleThickness?: number,
  displaySize?: AuraSize,
): AuraArcBoundaryPoints | null {
  const boundaryInput = createAuraArcBoundaryInput(
    crop,
    visibleThickness,
    displaySize,
  );
  if (!boundaryInput) {
    return null;
  }

  const boundaries = createArcBoundaryPoints(
    boundaryInput.curvePoints,
    boundaryInput.thickness,
  );
  if (!boundaries) {
    return null;
  }

  return { ...boundaries, targetSize: boundaryInput.targetSize };
}

export { createAuraArcBoundaryPoints };
