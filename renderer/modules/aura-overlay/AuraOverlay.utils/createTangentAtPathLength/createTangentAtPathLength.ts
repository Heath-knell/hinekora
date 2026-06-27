import type {
  ArcGeometryPoint,
  SampledGeometryPoint,
} from "../AuraOverlay.utils.types";
import { normalizeGeometryPoint } from "../normalizeGeometryPoint/normalizeGeometryPoint";
import { resolveSamplePair } from "../resolveSamplePair/resolveSamplePair";

function createTangentAtPathLength(
  points: SampledGeometryPoint[],
  targetLength: number,
  fallback: ArcGeometryPoint,
): ArcGeometryPoint {
  const { next, previous } = resolveSamplePair(points, targetLength);
  const tangent = normalizeGeometryPoint({
    x: next.x - previous.x,
    y: next.y - previous.y,
  });

  return tangent.x === 0 && tangent.y === 0 ? fallback : tangent;
}

export { createTangentAtPathLength };
