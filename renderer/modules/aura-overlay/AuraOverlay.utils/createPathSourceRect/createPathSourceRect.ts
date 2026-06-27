import type {
  ArcGeometryPoint,
  PathSourceRect,
  PathSourceRectInput,
} from "../AuraOverlay.utils.types";
import { clampGeometryValue } from "../clampGeometryValue/clampGeometryValue";

function createPathSourceRect({
  halfNormalLength,
  halfTangentLength,
  normal,
  point,
  tangent,
  videoSize,
}: PathSourceRectInput): PathSourceRect {
  const corners = [
    createOffsetPoint(
      point,
      tangent,
      normal,
      halfTangentLength,
      halfNormalLength,
    ),
    createOffsetPoint(
      point,
      tangent,
      normal,
      halfTangentLength,
      -halfNormalLength,
    ),
    createOffsetPoint(
      point,
      tangent,
      normal,
      -halfTangentLength,
      halfNormalLength,
    ),
    createOffsetPoint(
      point,
      tangent,
      normal,
      -halfTangentLength,
      -halfNormalLength,
    ),
  ];
  const videoWidth = Math.max(1, Math.round(videoSize.width));
  const videoHeight = Math.max(1, Math.round(videoSize.height));
  const minX = clampGeometryValue(
    Math.floor(Math.min(...corners.map((corner) => corner.x))),
    0,
    videoWidth - 1,
  );
  const minY = clampGeometryValue(
    Math.floor(Math.min(...corners.map((corner) => corner.y))),
    0,
    videoHeight - 1,
  );
  const maxX = clampGeometryValue(
    Math.ceil(Math.max(...corners.map((corner) => corner.x))),
    minX + 1,
    videoWidth,
  );
  const maxY = clampGeometryValue(
    Math.ceil(Math.max(...corners.map((corner) => corner.y))),
    minY + 1,
    videoHeight,
  );

  return {
    height: Math.max(1, maxY - minY),
    width: Math.max(1, maxX - minX),
    x: minX,
    y: minY,
  };
}

function createOffsetPoint(
  point: ArcGeometryPoint,
  tangent: ArcGeometryPoint,
  normal: ArcGeometryPoint,
  tangentLength: number,
  normalLength: number,
): ArcGeometryPoint {
  return {
    x: point.x + tangent.x * tangentLength + normal.x * normalLength,
    y: point.y + tangent.y * tangentLength + normal.y * normalLength,
  };
}

export { createPathSourceRect };
