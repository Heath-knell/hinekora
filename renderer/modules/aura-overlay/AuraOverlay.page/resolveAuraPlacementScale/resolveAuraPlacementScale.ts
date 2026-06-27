import { AuraPlacementScaleSettings, type OverlayPlacement } from "~/types";
import { clamp } from "../clamp/clamp";

function resolveAuraPlacementScale(placement: OverlayPlacement): number {
  return clamp(
    placement.scale,
    AuraPlacementScaleSettings.minScale,
    AuraPlacementScaleSettings.maxScale,
  );
}

export { resolveAuraPlacementScale };
