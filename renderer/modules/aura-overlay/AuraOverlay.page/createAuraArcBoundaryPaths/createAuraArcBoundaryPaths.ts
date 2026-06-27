import type { CropRegion } from "~/types";
import { createArcBoundaryPaths as createSharedArcBoundaryPaths } from "../../AuraOverlay.utils/AuraOverlay.utils";
import type {
  AuraArcBoundaryPaths,
  AuraSize,
} from "../AuraOverlay.page.utils.types";
import { createAuraArcBoundaryInput } from "../createAuraArcBoundaryInput/createAuraArcBoundaryInput";

function createAuraArcBoundaryPaths(
  crop: CropRegion,
  visibleThickness?: number,
  displaySize?: AuraSize,
): AuraArcBoundaryPaths | null {
  const boundaryInput = createAuraArcBoundaryInput(
    crop,
    visibleThickness,
    displaySize,
  );
  if (!boundaryInput) {
    return null;
  }

  return createSharedArcBoundaryPaths(
    boundaryInput.curvePoints,
    boundaryInput.thickness,
  );
}

export { createAuraArcBoundaryPaths };
