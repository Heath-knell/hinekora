import type {
  CropRegionSelection,
  CropRegionSelectionShape,
} from "~/main/modules/overlay-windows/OverlayWindows.dto";
import type { ArcBoundaryPaths } from "~/renderer/modules/aura-overlay/AuraOverlay.utils/AuraOverlay.utils";
import {
  createArcBoundaryPaths,
  createArcCurvePoints,
} from "~/renderer/modules/aura-overlay/AuraOverlay.utils/AuraOverlay.utils";

import { AuraPointPlacementSettings } from "~/types";

export interface CropSelectorPoint {
  x: number;
  y: number;
}

export type CropSelectorShape = CropRegionSelectionShape;

export function readCropSelectorShape(
  hash = window.location.hash,
): CropRegionSelectionShape {
  const shape = new URLSearchParams(hash.split("?")[1] ?? "").get("shape");

  return shape === "arc" || shape === "points" ? shape : "rect";
}

const arcSelectionThickness = 20;
const arcSampleCount = 24;
const maxPointSelectionPoints = AuraPointPlacementSettings.maxPoints;
const minCropSelectionSize = 8;
const pointSelectionSampleSize = AuraPointPlacementSettings.defaultSampleSize;

export function createCropSelection(
  start: CropSelectorPoint,
  end: CropSelectorPoint,
): CropRegionSelection {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function createArcCropSelection(
  start: CropSelectorPoint,
  end: CropSelectorPoint,
  control: CropSelectorPoint,
): CropRegionSelection {
  const radius = arcSelectionThickness / 2;
  const points = [
    ...createCircularArcCurvePoints(start, end, control),
    control,
  ];
  const minX = Math.min(...points.map((point) => point.x)) - radius;
  const minY = Math.min(...points.map((point) => point.y)) - radius;
  const maxX = Math.max(...points.map((point) => point.x)) + radius;
  const maxY = Math.max(...points.map((point) => point.y)) + radius;
  const x = Math.max(0, Math.floor(minX));
  const y = Math.max(0, Math.floor(minY));
  const width = Math.ceil(maxX) - x;
  const height = Math.ceil(maxY) - y;

  return {
    shape: "arc",
    x,
    y,
    width,
    height,
    arc: {
      startX: Math.round(start.x - x),
      startY: Math.round(start.y - y),
      endX: Math.round(end.x - x),
      endY: Math.round(end.y - y),
      controlX: Math.round(control.x - x),
      controlY: Math.round(control.y - y),
      thickness: arcSelectionThickness,
    },
  };
}

export function createPointCropSelection(
  points: CropSelectorPoint[],
): CropRegionSelection {
  const boundedPoints = points.slice(0, maxPointSelectionPoints);
  const radius = pointSelectionSampleSize / 2;
  const minX = Math.min(...boundedPoints.map((point) => point.x)) - radius;
  const minY = Math.min(...boundedPoints.map((point) => point.y)) - radius;
  const maxX = Math.max(...boundedPoints.map((point) => point.x)) + radius;
  const maxY = Math.max(...boundedPoints.map((point) => point.y)) + radius;
  const x = Math.max(0, Math.floor(minX));
  const y = Math.max(0, Math.floor(minY));
  const width = Math.max(pointSelectionSampleSize, Math.ceil(maxX) - x);
  const height = Math.max(pointSelectionSampleSize, Math.ceil(maxY) - y);

  return {
    shape: "points",
    x,
    y,
    width,
    height,
    points: boundedPoints.map((point) => ({
      x: Math.round(point.x - x),
      y: Math.round(point.y - y),
    })),
  };
}

export function createSvgPointPath(points: CropSelectorPoint[]): string {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(" ");
}

export function isUsableCropSelection(
  selection: CropRegionSelection | null,
): selection is CropRegionSelection {
  return (
    selection !== null &&
    selection.width >= minCropSelectionSize &&
    selection.height >= minCropSelectionSize
  );
}

export function isUsablePointSelection(points: CropSelectorPoint[]): boolean {
  return points.length > 0 && points.length <= maxPointSelectionPoints;
}

export function isUsableArcEndpointSelection(
  start: CropSelectorPoint,
  end: CropSelectorPoint,
): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) >= minCropSelectionSize;
}

export function createCircularArcCurvePoints(
  start: CropSelectorPoint,
  end: CropSelectorPoint,
  control: CropSelectorPoint,
  sampleCount = arcSampleCount,
): CropSelectorPoint[] {
  return createArcCurvePoints(start, end, control, sampleCount);
}

export function createArcSelectionBoundaryPaths(
  points: CropSelectorPoint[],
  thickness = arcSelectionThickness,
): ArcBoundaryPaths | null {
  return createArcBoundaryPaths(points, thickness);
}

export type { ArcBoundaryPaths };
export { maxPointSelectionPoints, pointSelectionSampleSize };
