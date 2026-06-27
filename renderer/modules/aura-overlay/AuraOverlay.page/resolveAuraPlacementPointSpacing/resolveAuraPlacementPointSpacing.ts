import type { OverlayPlacement } from "~/types";
import { resolveAuraPlacementPointGap } from "../resolveAuraPlacementPointGap/resolveAuraPlacementPointGap";

function resolveAuraPlacementPointSpacing(placement: OverlayPlacement): number {
  return resolveAuraPlacementPointGap(placement);
}

export { resolveAuraPlacementPointSpacing };
