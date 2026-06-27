import type { CropRegion } from "~/types";
import { createArcCurvePoints } from "../../AuraOverlay.utils/AuraOverlay.utils";
import type { AuraPoint } from "../AuraOverlay.page.utils.types";

function createAuraArcPoints(arc: NonNullable<CropRegion["arc"]>): AuraPoint[] {
  return createArcCurvePoints(
    { x: arc.startX, y: arc.startY },
    { x: arc.endX, y: arc.endY },
    { x: arc.controlX, y: arc.controlY },
  );
}

export { createAuraArcPoints };
