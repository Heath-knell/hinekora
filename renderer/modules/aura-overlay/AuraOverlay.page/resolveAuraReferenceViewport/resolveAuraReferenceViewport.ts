import type {
  AuraReferenceDimensions,
  AuraVideoSize,
} from "../AuraOverlay.page.utils.types";
import { isUsableAuraViewport } from "../isUsableAuraViewport/isUsableAuraViewport";
import { isUsableViewportDimension } from "../isUsableViewportDimension/isUsableViewportDimension";
import { legacyAuraReferenceViewport } from "../legacyAuraReferenceViewport/legacyAuraReferenceViewport";

function resolveAuraReferenceViewport(
  dimensions: AuraReferenceDimensions | null | undefined,
  fallbackViewport: AuraVideoSize | null = null,
): AuraVideoSize {
  const referenceWidth = dimensions?.referenceWidth;
  const referenceHeight = dimensions?.referenceHeight;

  if (
    isUsableViewportDimension(referenceWidth) &&
    isUsableViewportDimension(referenceHeight)
  ) {
    return {
      width: Math.round(referenceWidth),
      height: Math.round(referenceHeight),
    };
  }

  if (isUsableAuraViewport(fallbackViewport)) {
    return fallbackViewport;
  }

  return legacyAuraReferenceViewport;
}

export { resolveAuraReferenceViewport };
