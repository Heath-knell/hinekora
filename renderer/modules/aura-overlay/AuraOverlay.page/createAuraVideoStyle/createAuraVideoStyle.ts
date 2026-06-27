import type { CSSProperties } from "react";

import type { CropRegion, OverlayPlacement } from "~/types";
import type { AuraVideoSize } from "../AuraOverlay.page.utils.types";
import { projectAuraCropRegion } from "../projectAuraCropRegion/projectAuraCropRegion";
import { resolveAuraPlacementDisplaySize } from "../resolveAuraPlacementDisplaySize/resolveAuraPlacementDisplaySize";

function createAuraVideoStyle(
  crop: CropRegion,
  placement: OverlayPlacement,
  videoSize: AuraVideoSize,
  referenceViewport: AuraVideoSize | null = null,
): CSSProperties {
  const projectedCrop = projectAuraCropRegion(
    crop,
    videoSize,
    referenceViewport,
  );
  const width = Math.max(
    videoSize.width,
    projectedCrop.x + projectedCrop.width,
  );
  const height = Math.max(
    videoSize.height,
    projectedCrop.y + projectedCrop.height,
  );
  const placementSize = resolveAuraPlacementDisplaySize(
    crop,
    placement,
    videoSize,
    referenceViewport,
  );
  const scaleX = placementSize.width / projectedCrop.width;
  const scaleY = placementSize.height / projectedCrop.height;

  return {
    left: `${-projectedCrop.x * scaleX}px`,
    top: `${-projectedCrop.y * scaleY}px`,
    width: `${width * scaleX}px`,
    height: `${height * scaleY}px`,
  };
}

export { createAuraVideoStyle };
