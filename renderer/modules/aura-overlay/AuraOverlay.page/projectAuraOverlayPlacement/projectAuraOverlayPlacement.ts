import type { OverlayPlacement } from "~/types";
import type { AuraPoint, AuraVideoSize } from "../AuraOverlay.page.utils.types";
import { projectAuraPoint } from "../projectAuraPoint/projectAuraPoint";
import { resolveAuraReferenceViewport } from "../resolveAuraReferenceViewport/resolveAuraReferenceViewport";

function projectAuraOverlayPlacement(
  placement: OverlayPlacement,
  targetViewport: AuraVideoSize,
  fallbackReferenceViewport: AuraVideoSize | null = null,
): AuraPoint {
  return projectAuraPoint(
    placement,
    resolveAuraReferenceViewport(placement, fallbackReferenceViewport),
    targetViewport,
  );
}

export { projectAuraOverlayPlacement };
