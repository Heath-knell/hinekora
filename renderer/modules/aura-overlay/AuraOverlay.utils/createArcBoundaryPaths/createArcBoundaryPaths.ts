import type {
  ArcBoundaryPaths,
  ArcGeometryPoint,
} from "../AuraOverlay.utils.types";
import { createArcBoundaryPoints } from "../createArcBoundaryPoints/createArcBoundaryPoints";

function createArcBoundaryPaths(
  points: ArcGeometryPoint[],
  thickness: number,
): ArcBoundaryPaths | null {
  const boundaries = createArcBoundaryPoints(points, thickness);
  if (!boundaries) {
    return null;
  }

  return {
    inner: createSvgPath(boundaries.inner),
    outer: createSvgPath(boundaries.outer),
  };
}

function createSvgPath(points: ArcGeometryPoint[]): string {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";

      return `${command} ${roundSvgCoordinate(point.x)} ${roundSvgCoordinate(point.y)}`;
    })
    .join(" ");
}

function roundSvgCoordinate(value: number): number {
  return Math.round(value * 10) / 10;
}

export { createArcBoundaryPaths };
