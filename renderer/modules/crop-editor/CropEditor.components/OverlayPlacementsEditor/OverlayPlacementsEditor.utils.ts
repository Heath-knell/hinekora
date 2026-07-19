import {
  auraRotationDegrees,
  normalizeAuraPlacementNumberValue,
  readAuraRotationDegrees,
  resolveAuraPlacementArcVisibleThickness,
  resolveAuraPlacementPointSampleSize,
  resolveAuraPlacementPointSpacing,
} from "~/renderer/modules/aura-overlay/AuraOverlay.page/AuraOverlay.page.utils";

import {
  AuraPlacementScaleSettings,
  AuraPointPlacementSettings,
  type CropRegion,
  type OverlayPlacement,
} from "~/types";

type PlacementEditorNumberField =
  | "arcVisibleThickness"
  | "opacity"
  | "pointGap"
  | "pointSampleSize"
  | "scale"
  | "x"
  | "y";

type PlacementEditorToggleField = "arcStraightened" | "mirrored";

interface PlacementEditorNumberFieldConfig {
  field: PlacementEditorNumberField;
  label: string;
  max?: string;
  min?: string;
  step?: string;
}

const placementPositionNumberFields: PlacementEditorNumberFieldConfig[] = [
  { field: "x", label: "Left" },
  { field: "y", label: "Top" },
];

const placementScaleNumberField: PlacementEditorNumberFieldConfig = {
  field: "scale",
  label: "Scale",
  max: String(AuraPlacementScaleSettings.maxScale),
  min: String(AuraPlacementScaleSettings.minScale),
  step: "0.05",
};

const placementOpacityNumberField: PlacementEditorNumberFieldConfig = {
  field: "opacity",
  label: "Opacity",
  max: "1",
  min: "0",
  step: "0.05",
};

const placementToggleLabels: Record<PlacementEditorToggleField, string> = {
  arcStraightened: "Straightened",
  mirrored: "Mirrored",
};

const placementShapeNumberFieldsByShape = {
  arc: [{ field: "arcVisibleThickness", label: "Thickness", min: "1" }],
  points: [
    {
      field: "pointSampleSize",
      label: "Thickness",
      max: String(AuraPointPlacementSettings.maxSampleSize),
      min: String(AuraPointPlacementSettings.minSampleSize),
    },
    {
      field: "pointGap",
      label: "Spacing",
      max: String(AuraPointPlacementSettings.maxGap),
      min: String(AuraPointPlacementSettings.minGap),
    },
  ],
} satisfies Record<"arc" | "points", PlacementEditorNumberFieldConfig[]>;

function createPlacementPositionNumberFields(): PlacementEditorNumberFieldConfig[] {
  return placementPositionNumberFields;
}

function createPlacementScaleNumberFields(
  crop: CropRegion,
): PlacementEditorNumberFieldConfig[] {
  const shapeFields = createPlacementShapeNumberFields(crop);
  const firstShapeField = shapeFields[0];

  return [
    placementScaleNumberField,
    ...(firstShapeField ? [firstShapeField] : []),
  ];
}

function getPlacementOpacityNumberField(): PlacementEditorNumberFieldConfig {
  return placementOpacityNumberField;
}

function createPlacementSecondaryNumberFields(
  crop: CropRegion,
): PlacementEditorNumberFieldConfig[] {
  return createPlacementShapeNumberFields(crop).slice(1);
}

function createPlacementToggleFields(
  crop: CropRegion,
): PlacementEditorToggleField[] {
  return crop.shape === "arc" ? ["mirrored", "arcStraightened"] : ["mirrored"];
}

function getPlacementToggleLabel(field: PlacementEditorToggleField): string {
  return placementToggleLabels[field];
}

function createPlacementShapeNumberFields(
  crop: CropRegion,
): PlacementEditorNumberFieldConfig[] {
  if (crop.shape === "arc" && crop.arc) {
    return placementShapeNumberFieldsByShape.arc;
  }

  if (crop.shape === "points" && crop.points) {
    return placementShapeNumberFieldsByShape.points;
  }

  return [];
}

function isPlacementEditorNumberField(
  value: string | undefined,
): value is PlacementEditorNumberField {
  return (
    value === "arcVisibleThickness" ||
    value === "opacity" ||
    value === "pointGap" ||
    value === "pointSampleSize" ||
    value === "scale" ||
    value === "x" ||
    value === "y"
  );
}

function isPlacementEditorToggleField(
  value: string | undefined,
): value is PlacementEditorToggleField {
  return value === "arcStraightened" || value === "mirrored";
}

function resolvePlacementEditorNumberValue(
  field: PlacementEditorNumberField,
  crop: CropRegion,
  placement: OverlayPlacement,
): number {
  if (field === "arcVisibleThickness") {
    return resolveAuraPlacementArcVisibleThickness(crop, placement) ?? 1;
  }

  if (field === "pointSampleSize") {
    return resolveAuraPlacementPointSampleSize(placement);
  }

  if (field === "pointGap") {
    return resolveAuraPlacementPointSpacing(placement);
  }

  return placement[field];
}

function normalizePlacementEditorNumberValue(
  field: PlacementEditorNumberField,
  value: string,
): number | null {
  return normalizeAuraPlacementNumberValue(field, value);
}

function createPlacementEditorNumberPatch(
  field: PlacementEditorNumberField,
  value: number,
): Partial<OverlayPlacement> {
  return { [field]: value };
}

export type { PlacementEditorNumberFieldConfig };
export {
  auraRotationDegrees,
  createPlacementEditorNumberPatch,
  createPlacementPositionNumberFields,
  createPlacementScaleNumberFields,
  createPlacementSecondaryNumberFields,
  createPlacementToggleFields,
  getPlacementOpacityNumberField,
  getPlacementToggleLabel,
  isPlacementEditorNumberField,
  isPlacementEditorToggleField,
  normalizePlacementEditorNumberValue,
  readAuraRotationDegrees,
  resolvePlacementEditorNumberValue,
};
