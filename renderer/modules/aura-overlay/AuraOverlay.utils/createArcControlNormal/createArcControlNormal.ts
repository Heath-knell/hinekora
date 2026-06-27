import type { ArcGeometryPoint } from "../AuraOverlay.utils.types";
import { createCircleFromThreePoints } from "../createCircleFromThreePoints/createCircleFromThreePoints";
import { normalizeGeometryPoint } from "../normalizeGeometryPoint/normalizeGeometryPoint";

function createArcControlNormal(
  start: ArcGeometryPoint,
  end: ArcGeometryPoint,
  control: ArcGeometryPoint,
): ArcGeometryPoint {
  const circle = createCircleFromThreePoints(start, control, end);

  if (circle) {
    return normalizeGeometryPoint(
      {
        x: control.x - circle.x,
        y: control.y - circle.y,
      },
      { x: 0, y: 1 },
    );
  }

  const tangent = normalizeGeometryPoint(
    {
      x: end.x - start.x,
      y: end.y - start.y,
    },
    { x: 0, y: 1 },
  );
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const normal = normalizeGeometryPoint(
    { x: -tangent.y, y: tangent.x },
    { x: 0, y: 1 },
  );
  const controlSide =
    (control.x - midpoint.x) * normal.x + (control.y - midpoint.y) * normal.y;

  return controlSide >= 0
    ? normal
    : {
        x: -normal.x,
        y: -normal.y,
      };
}

export { createArcControlNormal };
