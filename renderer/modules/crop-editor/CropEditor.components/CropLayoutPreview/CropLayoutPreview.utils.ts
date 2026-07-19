import type { CSSProperties } from "react";

import {
  createAuraViewportProjection,
  projectAuraCropRegion,
  projectAuraOverlayPlacement,
  resolveAuraPlacementDisplaySize,
  resolveAuraReferenceViewport,
} from "~/renderer/modules/aura-overlay/AuraOverlay.page/AuraOverlay.page.utils";
import { findCapturePreviewSourceForTarget } from "~/renderer/modules/capture-preview/CapturePreview.utils/CapturePreview.utils";

import type {
  CapturePreviewSource,
  CaptureTarget,
  CropRegion,
  OverlayPlacement,
  Profile,
} from "~/types";

export type CropResizeCorner = "nw" | "ne" | "sw" | "se";

export interface CropPreviewBounds {
  width: number;
  height: number;
}

export interface CropPreviewBox {
  // This model represents viewport geometry; compositing stays in AuraOverlay.
  id: string;
  cropRegionId?: string;
  label: string;
  kind: "source" | "aura";
  x: number;
  y: number;
  width: number;
  height: number;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  opacity: number;
  toneIndex: number;
}

export interface CropLayoutPreviewModel {
  bounds: CropPreviewBounds;
  referenceBounds: CropPreviewBounds;
  viewportBounds: CropPreviewBounds;
  boxes: CropPreviewBox[];
}

type CropPreviewBoxStyle = CSSProperties & {
  "--crop-preview-accent": string;
};

const layoutFallbackBounds: CropPreviewBounds = { width: 1920, height: 1080 };
const auraAccentColors = [
  "var(--color-primary)",
  "var(--color-secondary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-info)",
  "var(--color-accent)",
] as const;
export const cropResizeCorners: CropResizeCorner[] = ["nw", "ne", "sw", "se"];

export function createCropLayoutPreview(
  profile: Profile,
  sourceBounds: CropPreviewBounds | null = null,
  visibleCropRegionId: string | null = null,
): CropLayoutPreviewModel {
  const profileReferenceBounds =
    resolveCropPreviewProfileBounds(profile, visibleCropRegionId) ??
    layoutFallbackBounds;
  const targetBounds = sourceBounds ?? profileReferenceBounds;
  const sourceBoxes = createSourceBoxes(
    profile,
    targetBounds,
    profileReferenceBounds,
  );
  const auraBoxes = createAuraBoxes(
    profile,
    targetBounds,
    profileReferenceBounds,
  );
  const boxes = [...sourceBoxes, ...auraBoxes].filter(
    (box) =>
      visibleCropRegionId === null || box.cropRegionId === visibleCropRegionId,
  );

  return {
    bounds: targetBounds,
    referenceBounds: profileReferenceBounds,
    viewportBounds: targetBounds,
    boxes,
  };
}

export function resolveCropPreviewSource(
  profile: Profile,
  sources: CapturePreviewSource[],
  selectedSourceId: string | null,
): CapturePreviewSource | null {
  return (
    findCapturePreviewSourceForTarget(profile.captureTarget, sources) ??
    sources.find((item) => item.id === selectedSourceId) ??
    null
  );
}

export function resolveCropPreviewSourceBounds(
  profile: Profile,
  sources: CapturePreviewSource[],
  selectedSourceId: string | null,
): CropPreviewBounds | null {
  const source = resolveCropPreviewSource(profile, sources, selectedSourceId);

  if (!source?.width || !source.height) {
    return readCaptureTargetBounds(profile.captureTarget);
  }

  return { width: source.width, height: source.height };
}

export function createCropPreviewBoxStyle(
  box: CropPreviewBox,
  bounds: CropPreviewBounds,
): CropPreviewBoxStyle {
  return {
    "--crop-preview-accent": getCropPreviewAccentColor(box),
    left: `${(box.x / bounds.width) * 100}%`,
    top: `${(box.y / bounds.height) * 100}%`,
    width: `${(box.width / bounds.width) * 100}%`,
    height: `${(box.height / bounds.height) * 100}%`,
    opacity: box.opacity,
  };
}

export function createCropPreviewBoxLabelStyle(
  box: CropPreviewBox,
  bounds: CropPreviewBounds,
): CropPreviewBoxStyle {
  const left = (box.x / bounds.width) * 100;
  const right = ((box.x + box.width) / bounds.width) * 100;
  const top = (box.y / bounds.height) * 100;
  const bottom = ((box.y + box.height) / bounds.height) * 100;
  const alignRight = left > 60;
  const placeBelow = top < 5;

  return {
    "--crop-preview-accent": getCropPreviewAccentColor(box),
    left: `${alignRight ? Math.min(100, right) : left}%`,
    top: `${placeBelow ? bottom : top}%`,
    transform: [
      alignRight ? "translateX(-100%)" : "",
      placeBelow ? "translateY(4px)" : "translateY(calc(-100% - 4px))",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export function formatCropPreviewBoxLabel(box: CropPreviewBox): string {
  return `${box.label} (${box.kind})`;
}

export function createCropPreviewStageStyle(
  bounds: CropPreviewBounds,
): CSSProperties {
  return {
    aspectRatio: `${bounds.width} / ${bounds.height}`,
  };
}

export function createCropPreviewSurfaceStyle(
  box: CropPreviewBox,
  bounds: CropPreviewBounds,
): CSSProperties {
  return {
    left: `${-(box.sourceX / box.sourceWidth) * 100}%`,
    top: `${-(box.sourceY / box.sourceHeight) * 100}%`,
    width: `${(bounds.width / box.sourceWidth) * 100}%`,
    height: `${(bounds.height / box.sourceHeight) * 100}%`,
  };
}

export function resizeCropRegionFromCorner(
  region: CropRegion,
  corner: CropResizeCorner,
  deltaX: number,
  deltaY: number,
): CropRegion {
  const roundedDeltaX = Math.round(deltaX);
  const roundedDeltaY = Math.round(deltaY);
  const right = region.x + region.width;
  const bottom = region.y + region.height;
  let x = region.x;
  let y = region.y;
  let width = region.width;
  let height = region.height;

  if (corner.includes("w")) {
    x = clamp(Math.round(region.x + roundedDeltaX), 0, right - 1);
    width = right - x;
  }

  if (corner.includes("e")) {
    width = clamp(Math.round(region.width + roundedDeltaX), 1, 100_000 - x);
  }

  if (corner.includes("n")) {
    y = clamp(Math.round(region.y + roundedDeltaY), 0, bottom - 1);
    height = bottom - y;
  }

  if (corner.includes("s")) {
    height = clamp(Math.round(region.height + roundedDeltaY), 1, 100_000 - y);
  }

  return { ...region, x, y, width, height };
}

export function resizeCropRegionFromPreviewDelta(
  region: CropRegion,
  corner: CropResizeCorner,
  deltaX: number,
  deltaY: number,
  targetViewport: CropPreviewBounds,
  fallbackReferenceViewport: CropPreviewBounds,
): CropRegion {
  const referenceViewport = resolveAuraReferenceViewport(
    region,
    fallbackReferenceViewport,
  );
  const projection = createAuraViewportProjection(
    referenceViewport,
    targetViewport,
  );

  return resizeCropRegionFromCorner(
    region,
    corner,
    deltaX / projection.scale,
    deltaY / projection.scale,
  );
}

function getCropPreviewAccentColor(box: CropPreviewBox): string {
  return box.kind === "aura"
    ? getAuraAccentColor(box)
    : "var(--crop-preview-source-color)";
}

function getAuraAccentColor(box: CropPreviewBox): string {
  return (
    auraAccentColors[box.toneIndex % auraAccentColors.length] ??
    auraAccentColors[0]
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createSourceBoxes(
  profile: Profile,
  targetBounds: CropPreviewBounds,
  fallbackReferenceBounds: CropPreviewBounds,
): CropPreviewBox[] {
  return profile.cropRegions.map((crop, index) => {
    const projectedCrop = projectAuraCropRegion(
      crop,
      targetBounds,
      resolveCropReferenceViewport(crop, fallbackReferenceBounds),
    );

    return {
      id: crop.id,
      cropRegionId: crop.id,
      label: crop.label,
      kind: "source" as const,
      x: projectedCrop.x,
      y: projectedCrop.y,
      width: projectedCrop.width,
      height: projectedCrop.height,
      sourceX: projectedCrop.x,
      sourceY: projectedCrop.y,
      sourceWidth: projectedCrop.width,
      sourceHeight: projectedCrop.height,
      opacity: 1,
      toneIndex: index,
    };
  });
}

function createAuraBoxes(
  profile: Profile,
  targetBounds: CropPreviewBounds,
  fallbackReferenceBounds: CropPreviewBounds,
): CropPreviewBox[] {
  const cropsById = new Map(
    profile.cropRegions.map((crop) => [crop.id, crop] as const),
  );

  return profile.overlayPlacements.flatMap((placement, index) => {
    const crop = cropsById.get(placement.cropRegionId);
    if (!crop) {
      return [];
    }
    const cropReferenceViewport = resolveCropReferenceViewport(
      crop,
      fallbackReferenceBounds,
    );
    const projectedCrop = projectAuraCropRegion(
      crop,
      targetBounds,
      cropReferenceViewport,
    );
    const projectedPlacement = projectAuraOverlayPlacement(
      placement,
      targetBounds,
      cropReferenceViewport,
    );
    const placementSize = resolveAuraPlacementDisplaySize(
      crop,
      placement,
      targetBounds,
      cropReferenceViewport,
    );

    return [
      {
        id: placement.id,
        cropRegionId: placement.cropRegionId,
        label: crop.label,
        kind: "aura" as const,
        x: projectedPlacement.x,
        y: projectedPlacement.y,
        width: placementSize.width,
        height: placementSize.height,
        sourceX: projectedCrop.x,
        sourceY: projectedCrop.y,
        sourceWidth: projectedCrop.width,
        sourceHeight: projectedCrop.height,
        opacity: placement.opacity,
        toneIndex: index,
      },
    ];
  });
}

function resolveCropReferenceViewport(
  crop: CropRegion,
  fallbackReferenceBounds: CropPreviewBounds,
): CropPreviewBounds {
  return resolveAuraReferenceViewport(crop, fallbackReferenceBounds);
}

function resolveCropPreviewProfileBounds(
  profile: Profile,
  visibleCropRegionId: string | null,
): CropPreviewBounds | null {
  const captureTargetBounds = readCaptureTargetBounds(profile.captureTarget);
  if (captureTargetBounds) {
    return captureTargetBounds;
  }

  const cropRegions = visibleCropRegionId
    ? profile.cropRegions.filter((region) => region.id === visibleCropRegionId)
    : profile.cropRegions;
  const overlayPlacements = visibleCropRegionId
    ? profile.overlayPlacements.filter(
        (placement) => placement.cropRegionId === visibleCropRegionId,
      )
    : profile.overlayPlacements;

  return (
    cropRegions.map(readCoordinateReferenceBounds).find(isCropPreviewBounds) ??
    overlayPlacements
      .map(readCoordinateReferenceBounds)
      .find(isCropPreviewBounds) ??
    profile.cropRegions
      .map(readCoordinateReferenceBounds)
      .find(isCropPreviewBounds) ??
    profile.overlayPlacements
      .map(readCoordinateReferenceBounds)
      .find(isCropPreviewBounds) ??
    null
  );
}

function readCaptureTargetBounds(
  captureTarget: CaptureTarget | null,
): CropPreviewBounds | null {
  if (!captureTarget?.width || !captureTarget.height) {
    return null;
  }

  return { width: captureTarget.width, height: captureTarget.height };
}

function readCoordinateReferenceBounds(
  value: CropRegion | OverlayPlacement,
): CropPreviewBounds | null {
  if (!value.referenceWidth || !value.referenceHeight) {
    return null;
  }

  return { width: value.referenceWidth, height: value.referenceHeight };
}

function isCropPreviewBounds(
  value: CropPreviewBounds | null,
): value is CropPreviewBounds {
  return value !== null;
}
