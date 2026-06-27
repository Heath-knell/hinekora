import type { CropRegion } from "~/types";
import { createArcControlNormal } from "../../AuraOverlay.utils/AuraOverlay.utils";
import type { AuraSize } from "../AuraOverlay.page.utils.types";

function createAuraArcDisplayThicknessScale(
  crop: CropRegion,
  displaySize: AuraSize,
): number {
  if (crop.shape !== "arc" || !crop.arc) {
    return 1;
  }

  const normal = createArcControlNormal(
    { x: crop.arc.startX, y: crop.arc.startY },
    { x: crop.arc.endX, y: crop.arc.endY },
    { x: crop.arc.controlX, y: crop.arc.controlY },
  );
  const scaleX = displaySize.width / crop.width;
  const scaleY = displaySize.height / crop.height;

  return Math.max(0.001, Math.hypot(normal.x * scaleX, normal.y * scaleY));
}

export { createAuraArcDisplayThicknessScale };
