import type { CropRegion } from "~/types";
import type {
  AuraArcBoundaryInput,
  AuraPoint,
  AuraSize,
} from "../AuraOverlay.page.utils.types";
import { clamp } from "../clamp/clamp";
import { createAuraArcPoints } from "../createAuraArcPoints/createAuraArcPoints";
import { resolveAuraArcDisplayThickness } from "../resolveAuraArcDisplayThickness/resolveAuraArcDisplayThickness";

function createAuraArcBoundaryInput(
  crop: CropRegion,
  visibleThickness?: number,
  displaySize?: AuraSize,
): AuraArcBoundaryInput | null {
  if (
    crop.shape !== "arc" ||
    !crop.arc ||
    crop.width <= 0 ||
    crop.height <= 0
  ) {
    return null;
  }

  const curvePoints = createAuraArcPoints(crop.arc).map((point) =>
    displaySize ? scaleAuraPointToDisplay(point, crop, displaySize) : point,
  );
  if (curvePoints.length < 2) {
    return null;
  }

  const targetSize = displaySize ?? crop;
  const defaultThickness = displaySize
    ? resolveAuraArcDisplayThickness(crop, displaySize, crop.arc.thickness)
    : crop.arc.thickness;
  const thickness = clamp(
    Math.round(visibleThickness ?? defaultThickness),
    1,
    Math.max(targetSize.width, targetSize.height),
  );

  return { curvePoints, targetSize, thickness };
}

function scaleAuraPointToDisplay(
  point: AuraPoint,
  crop: CropRegion,
  displaySize: AuraSize,
): AuraPoint {
  return {
    x: (point.x / crop.width) * displaySize.width,
    y: (point.y / crop.height) * displaySize.height,
  };
}

export { createAuraArcBoundaryInput };
