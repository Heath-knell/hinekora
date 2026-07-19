import type { OverlayPlacement } from "~/types";

type AuraRotationDegrees = NonNullable<OverlayPlacement["rotationDegrees"]>;

const auraRotationDegrees = [
  0, 90, 180, 270,
] as const satisfies readonly AuraRotationDegrees[];

function readAuraRotationDegrees(value: string): AuraRotationDegrees | null {
  const numericValue = Number(value);

  return auraRotationDegrees.includes(numericValue as AuraRotationDegrees)
    ? (numericValue as AuraRotationDegrees)
    : null;
}

export type { AuraRotationDegrees };
export { auraRotationDegrees, readAuraRotationDegrees };
