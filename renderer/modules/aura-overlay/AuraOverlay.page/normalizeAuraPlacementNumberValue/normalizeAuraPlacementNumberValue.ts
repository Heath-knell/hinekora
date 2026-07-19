import {
  AuraPlacementScaleSettings,
  AuraPointPlacementSettings,
} from "~/types";

type AuraPlacementNumberField =
  | "arcVisibleThickness"
  | "height"
  | "opacity"
  | "pointGap"
  | "pointSampleSize"
  | "scale"
  | "thickness"
  | "width"
  | "x"
  | "y";

function normalizeAuraPlacementNumberValue(
  field: AuraPlacementNumberField,
  value: string,
): number | null {
  if (value.trim() === "") {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  if (field === "scale") {
    return clamp(
      Math.round(numericValue * 100) / 100,
      AuraPlacementScaleSettings.minScale,
      AuraPlacementScaleSettings.maxScale,
    );
  }

  if (field === "opacity") {
    return clamp(Math.round(numericValue * 100) / 100, 0, 1);
  }

  if (field === "pointGap") {
    return Math.round(
      clamp(
        numericValue,
        AuraPointPlacementSettings.minGap,
        AuraPointPlacementSettings.maxGap,
      ),
    );
  }

  if (field === "pointSampleSize") {
    return Math.round(
      clamp(
        numericValue,
        AuraPointPlacementSettings.minSampleSize,
        AuraPointPlacementSettings.maxSampleSize,
      ),
    );
  }

  if (field === "height" || field === "width") {
    return Math.round(Math.max(10, numericValue));
  }

  const minimum =
    field === "arcVisibleThickness" || field === "thickness" ? 1 : -100_000;

  return clamp(Math.round(numericValue), minimum, 100_000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export { normalizeAuraPlacementNumberValue };
