import { AuraPointPlacementSettings, type OverlayPlacement } from "~/types";
import { clamp } from "../clamp/clamp";

function resolveAuraPlacementPointSampleSize(
  placement: OverlayPlacement,
): number {
  return clamp(
    Math.round(
      placement.pointSampleSize ?? AuraPointPlacementSettings.defaultSampleSize,
    ),
    AuraPointPlacementSettings.minSampleSize,
    AuraPointPlacementSettings.maxSampleSize,
  );
}

export { resolveAuraPlacementPointSampleSize };
