import {
  AuraPlacementScaleSettings,
  type CropRegion,
  createCoordinateReferenceDimensions,
  type OverlayPlacement,
} from "~/types";
import type {
  AuraResizeCorner,
  AuraVideoSize,
} from "../AuraOverlay.page.utils.types";
import { clamp } from "../clamp/clamp";
import { projectAuraBox } from "../projectAuraBox/projectAuraBox";
import { projectAuraPoint } from "../projectAuraPoint/projectAuraPoint";
import { resolveAuraPlacementScale } from "../resolveAuraPlacementScale/resolveAuraPlacementScale";
import { resolveAuraReferenceViewport } from "../resolveAuraReferenceViewport/resolveAuraReferenceViewport";
import { unprojectAuraPoint } from "../unprojectAuraPoint/unprojectAuraPoint";

function resizeAuraPlacementFromCorner(
  crop: CropRegion,
  placement: OverlayPlacement,
  corner: AuraResizeCorner,
  deltaX: number,
  deltaY: number,
  targetViewport?: AuraVideoSize,
  fallbackReferenceViewport: AuraVideoSize | null = null,
): OverlayPlacement {
  if (targetViewport) {
    return resizeProjectedAuraPlacementFromCorner(
      crop,
      placement,
      corner,
      deltaX,
      deltaY,
      targetViewport,
      fallbackReferenceViewport,
    );
  }

  const placementScale = resolveAuraPlacementScale(placement);
  const width = crop.width * placementScale;
  const height = crop.height * placementScale;
  const nextWidth = corner.includes("w") ? width - deltaX : width + deltaX;
  const nextHeight = corner.includes("n") ? height - deltaY : height + deltaY;
  const nextScaleX = nextWidth / crop.width;
  const nextScaleY = nextHeight / crop.height;
  const nextScale =
    Math.abs(nextScaleX - placementScale) >
    Math.abs(nextScaleY - placementScale)
      ? nextScaleX
      : nextScaleY;
  const scale = clamp(
    Math.round(nextScale * 1_000) / 1_000,
    AuraPlacementScaleSettings.minScale,
    AuraPlacementScaleSettings.maxScale,
  );
  const scaledWidth = crop.width * scale;
  const scaledHeight = crop.height * scale;

  return {
    ...placement,
    scale,
    x: corner.includes("w")
      ? Math.max(0, Math.round(placement.x + width - scaledWidth))
      : placement.x,
    y: corner.includes("n")
      ? Math.max(0, Math.round(placement.y + height - scaledHeight))
      : placement.y,
  };
}

function resizeProjectedAuraPlacementFromCorner(
  crop: CropRegion,
  placement: OverlayPlacement,
  corner: AuraResizeCorner,
  deltaX: number,
  deltaY: number,
  targetViewport: AuraVideoSize,
  fallbackReferenceViewport: AuraVideoSize | null,
): OverlayPlacement {
  const cropReferenceViewport = resolveAuraReferenceViewport(
    crop,
    fallbackReferenceViewport,
  );
  const placementReferenceViewport = resolveAuraReferenceViewport(
    placement,
    cropReferenceViewport,
  );
  const projectedCrop = projectAuraBox(
    crop,
    cropReferenceViewport,
    targetViewport,
  );
  const projectedPlacement = projectAuraPoint(
    placement,
    placementReferenceViewport,
    targetViewport,
  );
  const placementScale = resolveAuraPlacementScale(placement);
  const width = projectedCrop.width * placementScale;
  const height = projectedCrop.height * placementScale;
  const nextWidth = corner.includes("w") ? width - deltaX : width + deltaX;
  const nextHeight = corner.includes("n") ? height - deltaY : height + deltaY;
  const nextScaleX = nextWidth / projectedCrop.width;
  const nextScaleY = nextHeight / projectedCrop.height;
  const nextScale =
    Math.abs(nextScaleX - placementScale) >
    Math.abs(nextScaleY - placementScale)
      ? nextScaleX
      : nextScaleY;
  const scale = clamp(
    Math.round(nextScale * 1_000) / 1_000,
    AuraPlacementScaleSettings.minScale,
    AuraPlacementScaleSettings.maxScale,
  );
  const scaledWidth = projectedCrop.width * scale;
  const scaledHeight = projectedCrop.height * scale;
  const x = corner.includes("w")
    ? projectedPlacement.x + width - scaledWidth
    : projectedPlacement.x;
  const y = corner.includes("n")
    ? projectedPlacement.y + height - scaledHeight
    : projectedPlacement.y;
  const referencePoint = unprojectAuraPoint(
    {
      x: Math.max(0, Math.round(x)),
      y: Math.max(0, Math.round(y)),
    },
    placementReferenceViewport,
    targetViewport,
  );

  return {
    ...placement,
    ...createCoordinateReferenceDimensions(placementReferenceViewport),
    scale,
    x: corner.includes("w")
      ? Math.max(0, Math.round(referencePoint.x))
      : placement.x,
    y: corner.includes("n")
      ? Math.max(0, Math.round(referencePoint.y))
      : placement.y,
  };
}

export { resizeAuraPlacementFromCorner };
