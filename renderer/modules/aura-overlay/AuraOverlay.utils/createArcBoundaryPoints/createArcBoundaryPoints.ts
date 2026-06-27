import type {
  ArcBoundaryPoints,
  ArcGeometryPoint,
} from "../AuraOverlay.utils.types";

function createArcBoundaryPoints(
  points: ArcGeometryPoint[],
  thickness: number,
): ArcBoundaryPoints | null {
  if (points.length < 2) {
    return null;
  }

  const radius = Math.max(1, Math.round(thickness)) / 2;

  return {
    inner: createArcBoundarySidePoints(points, -radius),
    outer: createArcBoundarySidePoints(points, radius),
  };
}

function createArcBoundarySidePoints(
  points: ArcGeometryPoint[],
  radius: number,
): ArcGeometryPoint[] {
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)] ?? point;
    const next = points[Math.min(points.length - 1, index + 1)] ?? point;
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const length = Math.hypot(tangentX, tangentY) || 1;
    const normalX = -tangentY / length;
    const normalY = tangentX / length;

    return {
      x: point.x + normalX * radius,
      y: point.y + normalY * radius,
    };
  });
}

export { createArcBoundaryPoints };
