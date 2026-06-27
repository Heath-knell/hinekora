import type { CropRegion, OverlayPlacement } from "~/types";
import {
  type AuraPoint,
  type AuraSize,
  type AuraVideoSize,
  projectAuraCropRegion,
  resolveAuraPlacementPointSampleSize,
} from "../../AuraOverlay.page/AuraOverlay.page.utils";
import {
  createPathSampleVideoGeometry,
  drawPathSampleVideoFrame,
  type PathSampleVideoGeometry,
  shouldDrawPathSampleVideoFrame,
} from "../../AuraOverlay.utils/AuraOverlay.utils";

interface CreatePointStackVideoGeometryInput {
  crop: CropRegion;
  displaySize: AuraSize;
  placement: OverlayPlacement;
  referenceViewport: AuraVideoSize | null;
  videoSize: AuraVideoSize;
}

interface DrawPointStackVideoFrameInput {
  canvas: HTMLCanvasElement;
  geometry: PointStackVideoGeometry;
  video: HTMLVideoElement;
}

type PointStackVideoGeometry = PathSampleVideoGeometry;

const maxSegmentCount = 48;
const minSegmentCount = 2;
const targetSegmentHeight = 18;

function createPointStackVideoGeometry({
  crop,
  displaySize,
  placement,
  referenceViewport,
  videoSize,
}: CreatePointStackVideoGeometryInput): PointStackVideoGeometry | null {
  if (crop.shape !== "points" || !crop.points?.length) {
    return null;
  }

  const width = Math.max(1, Math.round(displaySize.width));
  const height = Math.max(1, Math.round(displaySize.height));
  const pathPoints = createProjectedPointPathPoints(
    crop,
    videoSize,
    referenceViewport,
  );
  const targetThickness = width;
  const sourceThickness = createProjectedSourceThickness(
    crop,
    placement,
    videoSize,
    referenceViewport,
  );

  return createPathSampleVideoGeometry({
    height,
    maxSegmentCount,
    minSegmentCount,
    outputAxis: "y",
    pathPoints,
    sourceThickness,
    targetOutputSegmentLength: targetSegmentHeight,
    targetThickness,
    videoSize,
    width,
  });
}

function drawPointStackVideoFrame({
  canvas,
  geometry,
  video,
}: DrawPointStackVideoFrameInput): void {
  drawPathSampleVideoFrame({ canvas, geometry, video });
}

function shouldDrawPointStackFrame(
  nowMs: number,
  lastDrawMs: number | null,
): boolean {
  return shouldDrawPathSampleVideoFrame(nowMs, lastDrawMs);
}

function createProjectedPointPathPoints(
  crop: CropRegion,
  videoSize: AuraVideoSize,
  referenceViewport: AuraVideoSize | null,
): AuraPoint[] {
  if (crop.shape !== "points" || !crop.points?.length) {
    return [];
  }

  const projectedCrop = projectAuraCropRegion(
    crop,
    videoSize,
    referenceViewport,
  );

  return crop.points.map((point) => ({
    x: projectedCrop.x + (point.x / crop.width) * projectedCrop.width,
    y: projectedCrop.y + (point.y / crop.height) * projectedCrop.height,
  }));
}

function createProjectedSourceThickness(
  crop: CropRegion,
  placement: OverlayPlacement,
  videoSize: AuraVideoSize,
  referenceViewport: AuraVideoSize | null,
): number {
  const projectedCrop = projectAuraCropRegion(
    crop,
    videoSize,
    referenceViewport,
  );
  const sourceScale = Math.min(
    projectedCrop.width / crop.width,
    projectedCrop.height / crop.height,
  );

  return Math.max(
    1,
    resolveAuraPlacementPointSampleSize(placement) * sourceScale,
  );
}

export type { PointStackVideoGeometry };
export {
  createPointStackVideoGeometry,
  drawPointStackVideoFrame,
  shouldDrawPointStackFrame,
};
