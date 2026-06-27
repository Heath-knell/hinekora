import type {
  ArcGeometryPoint,
  CreatePathSampleVideoGeometryInput,
  PathSampleVideoGeometry,
  PathSampleVideoSegment,
} from "../AuraOverlay.utils.types";
import { createPathSampleVideoSourceBounds } from "../createPathSampleVideoSourceBounds/createPathSampleVideoSourceBounds";
import { createPathSourceRect } from "../createPathSourceRect/createPathSourceRect";
import { createSampledPathPoints } from "../createSampledPathPoints/createSampledPathPoints";
import { createTangentAtPathLength } from "../createTangentAtPathLength/createTangentAtPathLength";
import { interpolateSampledPathPoint } from "../interpolateSampledPathPoint/interpolateSampledPathPoint";
import { resolvePathSampleSegmentCount } from "../resolvePathSampleSegmentCount/resolvePathSampleSegmentCount";

function createPathSampleVideoGeometry({
  height,
  maxSegmentCount,
  minSegmentCount,
  outputAxis,
  pathPoints,
  sourceThickness,
  targetOutputSegmentLength,
  targetThickness,
  videoSize,
  width,
}: CreatePathSampleVideoGeometryInput): PathSampleVideoGeometry | null {
  const sampledPoints = createSampledPathPoints(pathPoints);
  const totalLength = sampledPoints.at(-1)?.length ?? 0;
  if (sampledPoints.length < 2 || totalLength <= 0) {
    return null;
  }

  const outputLength = outputAxis === "x" ? width : height;
  const crossLength = outputAxis === "x" ? height : width;
  const segmentCount = resolvePathSampleSegmentCount({
    maxSegmentCount,
    minSegmentCount,
    outputLength,
    targetOutputSegmentLength,
    totalLength,
  });
  const segmentLength = outputLength / segmentCount;
  const crossOffset = (crossLength - targetThickness) / 2;
  const tangentScale = outputLength / totalLength;
  const normalScale = targetThickness / sourceThickness;
  const fallbackTangent = outputAxis === "x" ? { x: 1, y: 0 } : { x: 0, y: 1 };
  const segments = Array.from({ length: segmentCount }, (_, index) =>
    createPathSampleVideoSegment({
      crossOffset,
      index,
      normalScale,
      outputAxis,
      sampledPoints,
      segmentCount,
      segmentLength,
      sourceThickness,
      fallbackTangent,
      tangentScale,
      targetThickness,
      totalLength,
      videoSize,
    }),
  );

  return {
    height,
    segments,
    sourceBounds: createPathSampleVideoSourceBounds(segments),
    width,
  };
}

interface CreatePathSampleVideoSegmentInput {
  crossOffset: number;
  fallbackTangent: ArcGeometryPoint;
  index: number;
  normalScale: number;
  outputAxis: "x" | "y";
  sampledPoints: ReturnType<typeof createSampledPathPoints>;
  segmentCount: number;
  segmentLength: number;
  sourceThickness: number;
  tangentScale: number;
  targetThickness: number;
  totalLength: number;
  videoSize: CreatePathSampleVideoGeometryInput["videoSize"];
}

function createPathSampleVideoSegment({
  crossOffset,
  fallbackTangent,
  index,
  normalScale,
  outputAxis,
  sampledPoints,
  segmentCount,
  segmentLength,
  sourceThickness,
  tangentScale,
  targetThickness,
  totalLength,
  videoSize,
}: CreatePathSampleVideoSegmentInput): PathSampleVideoSegment {
  const outputStart = index * segmentLength;
  const point = interpolateSampledPathPoint(
    sampledPoints,
    ((index + 0.5) / segmentCount) * totalLength,
  );
  const tangent = createTangentAtPathLength(
    sampledPoints,
    point.length,
    fallbackTangent,
  );
  const normal = { x: -tangent.y, y: tangent.x };
  const sourceRect = createPathSourceRect({
    halfNormalLength: sourceThickness / 2 + 2,
    halfTangentLength: segmentLength / tangentScale / 2 + 2,
    normal,
    point,
    tangent,
    videoSize,
  });

  if (outputAxis === "x") {
    const destinationCenterX = outputStart + segmentLength / 2;
    const destinationCenterY = crossOffset + targetThickness / 2;

    return {
      clipHeight: targetThickness,
      clipWidth: segmentLength + 1,
      clipX: outputStart,
      clipY: crossOffset,
      sourceHeight: sourceRect.height,
      sourceWidth: sourceRect.width,
      sourceX: sourceRect.x,
      sourceY: sourceRect.y,
      transformA: tangentScale * tangent.x,
      transformB: normalScale * normal.x,
      transformC: tangentScale * tangent.y,
      transformD: normalScale * normal.y,
      transformE: destinationCenterX - tangentScale * dot(tangent, point),
      transformF: destinationCenterY - normalScale * dot(normal, point),
    };
  }

  const destinationCenterX = crossOffset + targetThickness / 2;
  const destinationCenterY = outputStart + segmentLength / 2;

  return {
    clipHeight: segmentLength + 1,
    clipWidth: targetThickness,
    clipX: crossOffset,
    clipY: outputStart,
    sourceHeight: sourceRect.height,
    sourceWidth: sourceRect.width,
    sourceX: sourceRect.x,
    sourceY: sourceRect.y,
    transformA: normalScale * normal.x,
    transformB: tangentScale * tangent.x,
    transformC: normalScale * normal.y,
    transformD: tangentScale * tangent.y,
    transformE: destinationCenterX - normalScale * dot(normal, point),
    transformF: destinationCenterY - tangentScale * dot(tangent, point),
  };
}

function dot(a: ArcGeometryPoint, b: ArcGeometryPoint): number {
  return a.x * b.x + a.y * b.y;
}

export { createPathSampleVideoGeometry };
