import type { CropRegion } from "~/types";
import type { AuraSize } from "../AuraOverlay.page.utils.types";
import { clamp } from "../clamp/clamp";
import { createAuraArcBoundaryPoints } from "../createAuraArcBoundaryPoints/createAuraArcBoundaryPoints";

function createAuraCropClipPath(
  crop: CropRegion,
  visibleThickness?: number,
  displaySize?: AuraSize,
): string | undefined {
  const boundaries = createAuraArcBoundaryPoints(
    crop,
    visibleThickness,
    displaySize,
  );
  if (!boundaries) {
    return undefined;
  }

  const polygonPoints = [
    ...boundaries.outer,
    ...[...boundaries.inner].reverse(),
  ].map((point) => {
    const x = clamp((point.x / boundaries.targetSize.width) * 100, 0, 100);
    const y = clamp((point.y / boundaries.targetSize.height) * 100, 0, 100);

    return `${roundCssPercent(x)}% ${roundCssPercent(y)}%`;
  });

  return `polygon(${polygonPoints.join(", ")})`;
}

function roundCssPercent(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export { createAuraCropClipPath };
