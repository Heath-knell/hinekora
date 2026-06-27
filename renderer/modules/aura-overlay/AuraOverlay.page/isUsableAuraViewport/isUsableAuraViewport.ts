import type { AuraVideoSize } from "../AuraOverlay.page.utils.types";
import { isUsableViewportDimension } from "../isUsableViewportDimension/isUsableViewportDimension";

function isUsableAuraViewport(
  viewport: AuraVideoSize | null | undefined,
): viewport is AuraVideoSize {
  return (
    isUsableViewportDimension(viewport?.width) &&
    isUsableViewportDimension(viewport?.height)
  );
}

export { isUsableAuraViewport };
