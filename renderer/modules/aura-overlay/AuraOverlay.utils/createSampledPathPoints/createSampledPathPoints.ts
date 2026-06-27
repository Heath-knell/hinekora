import type {
  ArcGeometryPoint,
  SampledGeometryPoint,
} from "../AuraOverlay.utils.types";

function createSampledPathPoints(
  points: ArcGeometryPoint[],
): SampledGeometryPoint[] {
  let length = 0;

  return points.map((point, index) => {
    const previous = points[index - 1];
    if (previous) {
      length += Math.hypot(point.x - previous.x, point.y - previous.y);
    }

    return { ...point, length };
  });
}

export { createSampledPathPoints };
