import {
  AuraPlacementScaleSettings,
  AuraPointPlacementSettings,
  type OverlayPlacement,
} from "~/types";

type AuraPlacementPropertiesPanelSide = "bottom" | "left" | "right" | "top";

interface AuraPlacementPropertiesPatch {
  arcStraightened?: boolean;
  arcVisibleThickness?: number;
  displayHeight?: number;
  displayWidth?: number;
  mirrored?: boolean;
  pointGap?: number;
  pointSampleSize?: number;
  recordHistory?: boolean;
  rotationDegrees?: RotationDegrees;
  scale?: number;
}

type NumberFieldName =
  | "height"
  | "pointGap"
  | "pointSampleSize"
  | "scale"
  | "thickness"
  | "width";

type RotationDegrees = 0 | 90 | 180 | 270;

type AuraPlacementPropertiesDraft = Record<NumberFieldName, string>;

const rotationSteps = [0, 90, 180, 270] as const;
const minimumDisplayDimension = 10;
const auraPlacementBaseNumberFields = [
  { label: "Width", min: "10", name: "width" },
  { label: "Height", min: "10", name: "height" },
  {
    label: "Scale",
    max: String(AuraPlacementScaleSettings.maxScale),
    min: String(AuraPlacementScaleSettings.minScale),
    name: "scale",
    step: "0.1",
  },
] as const;

function resolvePointSampleSize(placement: OverlayPlacement): number {
  return clamp(
    Math.round(
      placement.pointSampleSize ?? AuraPointPlacementSettings.defaultSampleSize,
    ),
    AuraPointPlacementSettings.minSampleSize,
    AuraPointPlacementSettings.maxSampleSize,
  );
}

function createPropertiesDraft(
  displayWidth: number,
  displayHeight: number,
  placement: OverlayPlacement,
  thickness: number | null,
): AuraPlacementPropertiesDraft {
  return {
    height: String(Math.round(displayHeight)),
    pointGap: String(
      placement.pointGap ?? AuraPointPlacementSettings.defaultGap,
    ),
    pointSampleSize: String(resolvePointSampleSize(placement)),
    scale: String(Number(resolvePlacementScale(placement).toFixed(2))),
    thickness: thickness !== null ? String(thickness) : "",
    width: String(Math.round(displayWidth)),
  };
}

function createCurrentNumericValues(
  displayWidth: number,
  displayHeight: number,
  placement: OverlayPlacement,
  thickness: number | null,
): Record<NumberFieldName, number | null> {
  return {
    height: Math.round(displayHeight),
    pointGap: placement.pointGap ?? AuraPointPlacementSettings.defaultGap,
    pointSampleSize: resolvePointSampleSize(placement),
    scale: Number(resolvePlacementScale(placement).toFixed(2)),
    thickness,
    width: Math.round(displayWidth),
  };
}

function normalizeNumberInputValue(
  fieldName: NumberFieldName,
  value: string,
): number | null {
  if (value.trim() === "") {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  if (fieldName === "scale") {
    return clamp(
      Math.round(numericValue * 100) / 100,
      AuraPlacementScaleSettings.minScale,
      AuraPlacementScaleSettings.maxScale,
    );
  }

  if (fieldName === "pointGap") {
    return Math.round(
      clamp(
        numericValue,
        AuraPointPlacementSettings.minGap,
        AuraPointPlacementSettings.maxGap,
      ),
    );
  }

  if (fieldName === "pointSampleSize") {
    return Math.round(
      clamp(
        numericValue,
        AuraPointPlacementSettings.minSampleSize,
        AuraPointPlacementSettings.maxSampleSize,
      ),
    );
  }

  if (fieldName === "height" || fieldName === "width") {
    return Math.round(Math.max(minimumDisplayDimension, numericValue));
  }

  return Math.round(Math.max(1, numericValue));
}

function createNumberFieldPatch(
  fieldName: NumberFieldName,
  value: number,
  recordHistory: boolean,
): AuraPlacementPropertiesPatch {
  if (fieldName === "width") {
    return { displayWidth: value, recordHistory };
  }

  if (fieldName === "height") {
    return { displayHeight: value, recordHistory };
  }

  if (fieldName === "scale") {
    return { recordHistory, scale: value };
  }

  if (fieldName === "pointSampleSize") {
    return { pointSampleSize: value, recordHistory };
  }

  if (fieldName === "pointGap") {
    return { pointGap: value, recordHistory };
  }

  return { arcVisibleThickness: value, recordHistory };
}

function readNumberFieldName(value: string): NumberFieldName | null {
  if (
    value === "height" ||
    value === "pointGap" ||
    value === "pointSampleSize" ||
    value === "scale" ||
    value === "thickness" ||
    value === "width"
  ) {
    return value;
  }

  return null;
}

function resolveNextRotationDegrees(
  rotation: RotationDegrees = 0,
): RotationDegrees {
  const rotationIndex = rotationSteps.indexOf(rotation);

  return rotationSteps[(rotationIndex + 1) % rotationSteps.length] ?? 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolvePlacementScale(placement: OverlayPlacement): number {
  return clamp(
    placement.scale,
    AuraPlacementScaleSettings.minScale,
    AuraPlacementScaleSettings.maxScale,
  );
}

export type {
  AuraPlacementPropertiesDraft,
  AuraPlacementPropertiesPanelSide,
  AuraPlacementPropertiesPatch,
  NumberFieldName,
  RotationDegrees,
};
export {
  auraPlacementBaseNumberFields,
  createCurrentNumericValues,
  createNumberFieldPatch,
  createPropertiesDraft,
  normalizeNumberInputValue,
  readNumberFieldName,
  resolveNextRotationDegrees,
};
