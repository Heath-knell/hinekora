import type { AuraPoint, AuraVideoSize } from "../AuraOverlay.page.utils.types";
import { createAuraViewportProjection } from "../createAuraViewportProjection/createAuraViewportProjection";

function projectAuraPoint(
  point: AuraPoint,
  referenceViewport: AuraVideoSize,
  targetViewport: AuraVideoSize,
): AuraPoint {
  const projection = createAuraViewportProjection(
    referenceViewport,
    targetViewport,
  );

  return {
    x: projection.offsetX + point.x * projection.scale,
    y: projection.offsetY + point.y * projection.scale,
  };
}

export { projectAuraPoint };
