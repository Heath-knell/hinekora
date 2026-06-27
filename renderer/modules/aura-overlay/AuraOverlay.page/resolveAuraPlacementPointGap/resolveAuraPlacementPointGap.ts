import { AuraPointPlacementSettings, type OverlayPlacement } from "~/types";
import { clamp } from "../clamp/clamp";

function resolveAuraPlacementPointGap(placement: OverlayPlacement): number {
  return clamp(
    Math.round(placement.pointGap ?? AuraPointPlacementSettings.defaultGap),
    AuraPointPlacementSettings.minGap,
    AuraPointPlacementSettings.maxGap,
  );
}

export { resolveAuraPlacementPointGap };
