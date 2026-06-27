import type { CropRegion, OverlayPlacement } from "~/types";
import type { AuraSize } from "../AuraOverlay.page.utils.types";
import { resolveAuraPlacementPointSampleSize } from "../resolveAuraPlacementPointSampleSize/resolveAuraPlacementPointSampleSize";
import { resolveAuraPlacementPointSpacing } from "../resolveAuraPlacementPointSpacing/resolveAuraPlacementPointSpacing";

function createAuraPointsDisplaySize(
  crop: CropRegion,
  placement: OverlayPlacement,
): AuraSize {
  const sampleSize = resolveAuraPlacementPointSampleSize(placement);
  const pointCount = Math.max(1, crop.points?.length ?? 0);
  const gapCount = Math.max(0, pointCount - 1);
  const pointGap = resolveAuraPlacementPointSpacing(placement);

  return {
    width: sampleSize,
    height: sampleSize * pointCount + pointGap * gapCount,
  };
}

export { createAuraPointsDisplaySize };
