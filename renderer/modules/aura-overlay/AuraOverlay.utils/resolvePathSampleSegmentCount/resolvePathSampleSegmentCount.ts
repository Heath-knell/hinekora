import type { ResolvePathSampleSegmentCountInput } from "../AuraOverlay.utils.types";
import { clampGeometryValue } from "../clampGeometryValue/clampGeometryValue";

function resolvePathSampleSegmentCount({
  maxSegmentCount,
  minSegmentCount,
  outputLength,
  targetOutputSegmentLength,
  targetSourceSegmentLength = targetOutputSegmentLength,
  totalLength,
}: ResolvePathSampleSegmentCountInput): number {
  return clampGeometryValue(
    Math.max(
      Math.ceil(outputLength / targetOutputSegmentLength),
      Math.ceil(totalLength / targetSourceSegmentLength),
    ),
    minSegmentCount,
    maxSegmentCount,
  );
}

export { resolvePathSampleSegmentCount };
