import type { AuraResizeCorner } from "../AuraOverlay.page.utils.types";
import { auraResizeCorners } from "../auraResizeCorners/auraResizeCorners";

function isAuraResizeCorner(
  value: string | undefined,
): value is AuraResizeCorner {
  return auraResizeCorners.includes(value as AuraResizeCorner);
}

export { isAuraResizeCorner };
