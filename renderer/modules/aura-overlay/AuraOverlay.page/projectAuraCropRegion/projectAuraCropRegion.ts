import type { CropRegion } from "~/types";
import type {
  AuraProjectedBox,
  AuraVideoSize,
} from "../AuraOverlay.page.utils.types";
import { projectAuraBox } from "../projectAuraBox/projectAuraBox";
import { resolveAuraReferenceViewport } from "../resolveAuraReferenceViewport/resolveAuraReferenceViewport";

function projectAuraCropRegion(
  crop: CropRegion,
  targetViewport: AuraVideoSize,
  fallbackReferenceViewport: AuraVideoSize | null = null,
): AuraProjectedBox {
  return projectAuraBox(
    crop,
    resolveAuraReferenceViewport(crop, fallbackReferenceViewport),
    targetViewport,
  );
}

export { projectAuraCropRegion };
