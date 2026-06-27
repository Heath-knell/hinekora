import type { CropRegion, OverlayPlacement } from "~/types";
import type { AuraSize, AuraVideoSize } from "../AuraOverlay.page.utils.types";
import { createAuraPointsDisplaySize } from "../createAuraPointsDisplaySize/createAuraPointsDisplaySize";
import { projectAuraBox } from "../projectAuraBox/projectAuraBox";
import { projectAuraCropRegion } from "../projectAuraCropRegion/projectAuraCropRegion";
import { resolveAuraReferenceViewport } from "../resolveAuraReferenceViewport/resolveAuraReferenceViewport";

function resolveAuraPlacementBaseSize(
  crop: CropRegion,
  placement: OverlayPlacement,
  targetViewport: AuraVideoSize,
  fallbackReferenceViewport: AuraVideoSize | null = null,
): AuraSize {
  if (placement.width && placement.height) {
    const placementReferenceViewport = resolveAuraReferenceViewport(
      placement,
      resolveAuraReferenceViewport(crop, fallbackReferenceViewport),
    );

    return projectAuraBox(
      {
        x: 0,
        y: 0,
        width: placement.width,
        height: placement.height,
      },
      placementReferenceViewport,
      targetViewport,
    );
  }

  if (crop.shape === "points" && crop.points) {
    return createAuraPointsDisplaySize(crop, placement);
  }

  const projectedCrop = projectAuraCropRegion(
    crop,
    targetViewport,
    fallbackReferenceViewport,
  );

  return {
    width: projectedCrop.width,
    height: projectedCrop.height,
  };
}

export { resolveAuraPlacementBaseSize };
