import type {
  CropRegion,
  OverlayPlacement,
  Profile,
  ProfileUpdateInput,
} from "~/types";
import type {
  ArcBoundaryPaths,
  ArcBoundaryPoints,
} from "../AuraOverlay.utils/AuraOverlay.utils";

type AuraResizeCorner = "nw" | "ne" | "sw" | "se";

interface AuraVideoSize {
  width: number;
  height: number;
}

interface AuraReferenceDimensions {
  referenceWidth?: number | null | undefined;
  referenceHeight?: number | null | undefined;
}

interface AuraProjectedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AuraSize {
  width: number;
  height: number;
}

interface AuraPoint {
  x: number;
  y: number;
}

type AuraArcBoundaryPaths = ArcBoundaryPaths;

interface AuraArcBoundaryPoints extends ArcBoundaryPoints {
  targetSize: AuraSize;
}

interface AuraArcBoundaryInput {
  curvePoints: AuraPoint[];
  targetSize: AuraSize;
  thickness: number;
}

interface AuraViewportProjection {
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface AuraHistorySnapshot {
  cropRegions: CropRegion[];
  overlayPlacements: OverlayPlacement[];
}

type AuraProfile = Pick<Profile, "cropRegions" | "overlayPlacements">;
type AuraProfileUpdate = ProfileUpdateInput;

export type {
  AuraArcBoundaryInput,
  AuraArcBoundaryPaths,
  AuraArcBoundaryPoints,
  AuraHistorySnapshot,
  AuraPoint,
  AuraProfile,
  AuraProfileUpdate,
  AuraProjectedBox,
  AuraReferenceDimensions,
  AuraResizeCorner,
  AuraSize,
  AuraVideoSize,
  AuraViewportProjection,
};
