import type { SampledGeometryPoint } from "../AuraOverlay.utils.types";

function resolveSamplePair(
  points: SampledGeometryPoint[],
  targetLength: number,
): { next: SampledGeometryPoint; previous: SampledGeometryPoint } {
  const fallback = points[0];
  const fallbackNext = points[1] ?? fallback;
  if (!fallback || !fallbackNext) {
    return {
      next: { length: 1, x: 0, y: 0 },
      previous: { length: 0, x: 0, y: 0 },
    };
  }

  const nextIndex = points.findIndex((point) => point.length >= targetLength);
  const index =
    nextIndex >= 1 ? nextIndex : nextIndex === 0 ? 1 : points.length - 1;
  const next = points[index] ?? fallbackNext;
  const previous = points[index - 1] ?? fallback;

  return { next, previous };
}

export { resolveSamplePair };
