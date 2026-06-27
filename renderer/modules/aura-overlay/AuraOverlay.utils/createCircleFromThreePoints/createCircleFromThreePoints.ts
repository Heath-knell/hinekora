import type { ArcGeometryPoint } from "../AuraOverlay.utils.types";

interface ArcGeometryCircle extends ArcGeometryPoint {
  radius: number;
}

const collinearPointEpsilon = 0.001;

function createCircleFromThreePoints(
  first: ArcGeometryPoint,
  second: ArcGeometryPoint,
  third: ArcGeometryPoint,
): ArcGeometryCircle | null {
  const determinant =
    2 *
    (first.x * (second.y - third.y) +
      second.x * (third.y - first.y) +
      third.x * (first.y - second.y));
  if (Math.abs(determinant) < collinearPointEpsilon) {
    return null;
  }

  const firstMagnitude = first.x * first.x + first.y * first.y;
  const secondMagnitude = second.x * second.x + second.y * second.y;
  const thirdMagnitude = third.x * third.x + third.y * third.y;
  const x =
    (firstMagnitude * (second.y - third.y) +
      secondMagnitude * (third.y - first.y) +
      thirdMagnitude * (first.y - second.y)) /
    determinant;
  const y =
    (firstMagnitude * (third.x - second.x) +
      secondMagnitude * (first.x - third.x) +
      thirdMagnitude * (second.x - first.x)) /
    determinant;

  return {
    x,
    y,
    radius: Math.hypot(first.x - x, first.y - y),
  };
}

export { createCircleFromThreePoints };
