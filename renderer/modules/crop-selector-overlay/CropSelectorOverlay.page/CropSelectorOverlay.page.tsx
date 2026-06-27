import { useEffect } from "react";

import { OverlayExitNotice } from "~/renderer/components/OverlayExitNotice/OverlayExitNotice";

import { ArcSelectionPreview } from "../CropSelectorOverlay.components/ArcSelectionPreview/ArcSelectionPreview";
import { CropSelectionBox } from "../CropSelectorOverlay.components/CropSelectionBox/CropSelectionBox";
import { CropSelectorControlsHelp } from "../CropSelectorOverlay.components/CropSelectorControlsHelp/CropSelectorControlsHelp";
import { PointSelectionPreview } from "../CropSelectorOverlay.components/PointSelectionPreview/PointSelectionPreview";
import { useCropSelectorSelection } from "../CropSelectorOverlay.hooks/useCropSelectorSelection/useCropSelectorSelection";
import styles from "./CropSelectorOverlayPage.module.css";

const cropSelectorRouteClassName = "is-crop-selector-route";

function CropSelectorOverlayPage() {
  const {
    arcEnd,
    arcStart,
    handleContextMenu,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hoverPoint,
    pointSelectionPoints,
    selection,
    shape,
  } = useCropSelectorSelection();

  useEffect(() => {
    document.documentElement.classList.add(cropSelectorRouteClassName);
    document.body.classList.add(cropSelectorRouteClassName);

    return () => {
      document.documentElement.classList.remove(cropSelectorRouteClassName);
      document.body.classList.remove(cropSelectorRouteClassName);
    };
  }, []);

  return (
    <main
      aria-label="Crop selector"
      className={styles.overlay}
      role="application"
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {shape === "arc" && (
        <ArcSelectionPreview
          arcEnd={arcEnd}
          arcStart={arcStart}
          hoverPoint={hoverPoint}
        />
      )}
      {shape === "points" && (
        <PointSelectionPreview
          hoverPoint={hoverPoint}
          points={pointSelectionPoints}
        />
      )}
      {selection && <CropSelectionBox selection={selection} />}
      <OverlayExitNotice overlayName="grid selector" />
      <CropSelectorControlsHelp shape={shape} />
    </main>
  );
}

export { CropSelectorOverlayPage };
