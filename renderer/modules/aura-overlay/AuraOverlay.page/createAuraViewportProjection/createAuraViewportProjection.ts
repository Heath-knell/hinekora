import type {
  AuraVideoSize,
  AuraViewportProjection,
} from "../AuraOverlay.page.utils.types";
import { isUsableAuraViewport } from "../isUsableAuraViewport/isUsableAuraViewport";
import { legacyAuraReferenceViewport } from "../legacyAuraReferenceViewport/legacyAuraReferenceViewport";

function createAuraViewportProjection(
  referenceViewport: AuraVideoSize,
  targetViewport: AuraVideoSize,
): AuraViewportProjection {
  const reference = isUsableAuraViewport(referenceViewport)
    ? referenceViewport
    : legacyAuraReferenceViewport;
  const target = isUsableAuraViewport(targetViewport)
    ? targetViewport
    : reference;
  const scale = Math.min(
    target.width / reference.width,
    target.height / reference.height,
  );

  return {
    offsetX: (target.width - reference.width * scale) / 2,
    offsetY: (target.height - reference.height * scale) / 2,
    scale,
  };
}

export { createAuraViewportProjection };
