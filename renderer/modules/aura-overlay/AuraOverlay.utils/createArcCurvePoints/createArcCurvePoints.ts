import type { ArcGeometryPoint } from "../AuraOverlay.utils.types";
import { createCircleFromThreePoints } from "../createCircleFromThreePoints/createCircleFromThreePoints";

const defaultArcSampleCount = 40;

function createArcCurvePoints(
  start: ArcGeometryPoint,
  end: ArcGeometryPoint,
  control: ArcGeometryPoint,
  sampleCount = defaultArcSampleCount,
): ArcGeometryPoint[] {
  const circle = createCircleFromThreePoints(start, control, end);
  if (!circle) {
    return createQuadraticCurvePoints(start, end, control, sampleCount);
  }

  const startAngle = Math.atan2(start.y - circle.y, start.x - circle.x);
  const endAngle = Math.atan2(end.y - circle.y, end.x - circle.x);
  const controlAngle = Math.atan2(control.y - circle.y, control.x - circle.x);
  const sweepCounterClockwise =
    getCounterClockwiseDelta(startAngle, controlAngle) <=
    getCounterClockwiseDelta(startAngle, endAngle);
  const sweep = sweepCounterClockwise
    ? getCounterClockwiseDelta(startAngle, endAngle)
    : -getCounterClockwiseDelta(endAngle, startAngle);

  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const angle = startAngle + sweep * (index / sampleCount);

    return {
      x: circle.x + Math.cos(angle) * circle.radius,
      y: circle.y + Math.sin(angle) * circle.radius,
    };
  });
}

function createQuadraticCurvePoints(
  start: ArcGeometryPoint,
  end: ArcGeometryPoint,
  control: ArcGeometryPoint,
  sampleCount: number,
): ArcGeometryPoint[] {
  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const t = index / sampleCount;
    const inverseT = 1 - t;

    return {
      x:
        inverseT * inverseT * start.x +
        2 * inverseT * t * control.x +
        t * t * end.x,
      y:
        inverseT * inverseT * start.y +
        2 * inverseT * t * control.y +
        t * t * end.y,
    };
  });
}

function getCounterClockwiseDelta(fromAngle: number, toAngle: number): number {
  return (toAngle - fromAngle + Math.PI * 2) % (Math.PI * 2);
}

export { createArcCurvePoints };
