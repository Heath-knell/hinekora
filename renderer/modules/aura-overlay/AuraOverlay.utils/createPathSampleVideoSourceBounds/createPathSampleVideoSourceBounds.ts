import type {
  PathSampleVideoSegment,
  PathSampleVideoSourceBounds,
} from "../AuraOverlay.utils.types";

function createPathSampleVideoSourceBounds(
  segments: PathSampleVideoSegment[],
): PathSampleVideoSourceBounds | null {
  if (segments.length === 0) {
    return null;
  }

  const minX = Math.min(...segments.map((segment) => segment.sourceX));
  const minY = Math.min(...segments.map((segment) => segment.sourceY));
  const maxX = Math.max(
    ...segments.map((segment) => segment.sourceX + segment.sourceWidth),
  );
  const maxY = Math.max(
    ...segments.map((segment) => segment.sourceY + segment.sourceHeight),
  );

  return {
    height: Math.max(1, maxY - minY),
    width: Math.max(1, maxX - minX),
    x: minX,
    y: minY,
  };
}

export { createPathSampleVideoSourceBounds };
