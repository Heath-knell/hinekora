import type { SampledGeometryPoint } from "../AuraOverlay.utils.types";
import { resolveSamplePair } from "../resolveSamplePair/resolveSamplePair";

function interpolateSampledPathPoint(
  points: SampledGeometryPoint[],
  targetLength: number,
): SampledGeometryPoint {
  const { next, previous } = resolveSamplePair(points, targetLength);
  const lengthDelta = next.length - previous.length;
  const progress =
    lengthDelta > 0 ? (targetLength - previous.length) / lengthDelta : 0;

  return {
    x: previous.x + (next.x - previous.x) * progress,
    y: previous.y + (next.y - previous.y) * progress,
    length: targetLength,
  };
}

export { interpolateSampledPathPoint };
