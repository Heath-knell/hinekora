import type { CSSProperties } from "react";

import type { CropRegionSelection } from "~/main/modules/overlay-windows/OverlayWindows.dto";
import { maxPointSelectionPoints } from "~/renderer/modules/crop-selector-overlay/CropSelectorOverlay.utils/CropSelectorOverlay.utils";

import styles from "./CropSelectionBox.module.css";

interface CropSelectionBoxProps {
  selection: CropRegionSelection;
}

function CropSelectionBox({ selection }: CropSelectionBoxProps) {
  const selectionLabelStyle: CSSProperties = {
    left: `min(${selection.x}px, calc(100vw - 5rem))`,
    top:
      selection.y >= 32
        ? `${selection.y}px`
        : `${selection.y + selection.height}px`,
    transform:
      selection.y >= 32 ? "translateY(calc(-100% - 6px))" : "translateY(6px)",
  };

  return (
    <>
      <div
        className={
          selection.shape === "arc" || selection.shape === "points"
            ? styles.pathSelectionBox
            : styles.selectionBox
        }
        style={{
          left: `${selection.x}px`,
          top: `${selection.y}px`,
          width: `${selection.width}px`,
          height: `${selection.height}px`,
        }}
      />
      <span className={styles.selectionLabel} style={selectionLabelStyle}>
        {createSelectionLabel(selection)}
      </span>
    </>
  );
}

function createSelectionLabel(selection: CropRegionSelection): string {
  if (selection.shape === "arc") {
    return `Arc ${selection.arc?.thickness ?? 0}px`;
  }

  if (selection.shape === "points") {
    return `${selection.points?.length ?? 0} / ${maxPointSelectionPoints} points`;
  }

  return `${selection.width} x ${selection.height}`;
}

export { CropSelectionBox };
