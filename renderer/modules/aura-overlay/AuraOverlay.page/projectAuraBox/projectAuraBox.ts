import type {
  AuraProjectedBox,
  AuraVideoSize,
} from "../AuraOverlay.page.utils.types";
import { createAuraViewportProjection } from "../createAuraViewportProjection/createAuraViewportProjection";

function projectAuraBox(
  box: AuraProjectedBox,
  referenceViewport: AuraVideoSize,
  targetViewport: AuraVideoSize,
): AuraProjectedBox {
  const projection = createAuraViewportProjection(
    referenceViewport,
    targetViewport,
  );

  return {
    x: projection.offsetX + box.x * projection.scale,
    y: projection.offsetY + box.y * projection.scale,
    width: box.width * projection.scale,
    height: box.height * projection.scale,
  };
}

export { projectAuraBox };
