import type { ArcGeometryPoint } from "../AuraOverlay.utils.types";

function normalizeGeometryPoint(
  point: ArcGeometryPoint,
  fallback: ArcGeometryPoint = { x: 0, y: 0 },
): ArcGeometryPoint {
  const length = Math.hypot(point.x, point.y);
  if (length <= 0) {
    return fallback;
  }

  return {
    x: point.x / length,
    y: point.y / length,
  };
}

export { normalizeGeometryPoint };
