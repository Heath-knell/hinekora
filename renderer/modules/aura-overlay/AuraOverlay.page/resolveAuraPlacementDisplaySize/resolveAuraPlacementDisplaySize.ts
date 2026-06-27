import {
  AuraPointPlacementSettings,
  type CropRegion,
  type OverlayPlacement,
} from "~/types";
import type { AuraSize, AuraVideoSize } from "../AuraOverlay.page.utils.types";
import { resolveAuraPlacementBaseSize } from "../resolveAuraPlacementBaseSize/resolveAuraPlacementBaseSize";
import { resolveAuraPlacementScale } from "../resolveAuraPlacementScale/resolveAuraPlacementScale";

const minimumAuraDisplayDimension = 10;

function resolveAuraPlacementDisplaySize(
  crop: CropRegion,
  placement: OverlayPlacement,
  targetViewport: AuraVideoSize,
  fallbackReferenceViewport: AuraVideoSize | null = null,
): AuraSize {
  const baseSize = resolveAuraPlacementBaseSize(
    crop,
    placement,
    targetViewport,
    fallbackReferenceViewport,
  );
  const minimumDisplayDimension =
    crop.shape === "points"
      ? AuraPointPlacementSettings.minSampleSize
      : minimumAuraDisplayDimension;
  const scale = resolveAuraPlacementScale(placement);

  return {
    width: Math.max(minimumDisplayDimension, baseSize.width * scale),
    height: Math.max(minimumDisplayDimension, baseSize.height * scale),
  };
}

export { resolveAuraPlacementDisplaySize };
