import clsx from "clsx";

import { getAuraSelectionTypeHelp } from "~/renderer/modules/aura-selection/AuraSelection.utils/AuraSelection.utils";

import type { CropRegion } from "~/types";

interface AuraCropThumbnailBackgroundProps {
  blendMode?: "multiply" | "screen";
  className?: string;
  crop: CropRegion;
}

function AuraCropThumbnailBackground({
  blendMode = "screen",
  className,
  crop,
}: AuraCropThumbnailBackgroundProps) {
  const { iconClassName, Icon } = getAuraSelectionTypeHelp(
    crop.shape ?? "rect",
  );

  return (
    <span
      aria-hidden="true"
      className={clsx(
        "pointer-events-none absolute overflow-hidden",
        {
          "mix-blend-multiply": blendMode === "multiply",
          "mix-blend-screen": blendMode === "screen",
        },
        className,
      )}
    >
      <Icon
        className={clsx(
          "absolute inset-0 h-full w-full text-current",
          iconClassName,
        )}
      />
    </span>
  );
}

export { AuraCropThumbnailBackground };
