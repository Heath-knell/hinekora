import type { AuraPoint, AuraVideoSize } from "../AuraOverlay.page.utils.types";
import { createAuraViewportProjection } from "../createAuraViewportProjection/createAuraViewportProjection";

function unprojectAuraPoint(
  point: AuraPoint,
  referenceViewport: AuraVideoSize,
  targetViewport: AuraVideoSize,
): AuraPoint {
  const projection = createAuraViewportProjection(
    referenceViewport,
    targetViewport,
  );

  return {
    x: (point.x - projection.offsetX) / projection.scale,
    y: (point.y - projection.offsetY) / projection.scale,
  };
}

export { unprojectAuraPoint };
