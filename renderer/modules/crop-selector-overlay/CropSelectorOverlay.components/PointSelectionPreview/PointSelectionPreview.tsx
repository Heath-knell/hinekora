import {
  type CropSelectorPoint,
  createSvgPointPath,
} from "~/renderer/modules/crop-selector-overlay/CropSelectorOverlay.utils/CropSelectorOverlay.utils";

import sharedStyles from "../SelectionPreview/SelectionPreview.module.css";
import styles from "./PointSelectionPreview.module.css";

interface PointSelectionPreviewProps {
  hoverPoint: CropSelectorPoint | null;
  points: CropSelectorPoint[];
}

function PointSelectionPreview({
  hoverPoint,
  points,
}: PointSelectionPreviewProps) {
  if (points.length === 0) {
    return null;
  }

  const path = createSvgPointPath(points);
  const lastPoint = points.at(-1);

  return (
    <>
      <svg className={sharedStyles.overlay} aria-hidden="true">
        {points.length > 1 && <path className={styles.guide} d={path} />}
        {hoverPoint && lastPoint && (
          <line
            className={styles.guide}
            x1={lastPoint.x}
            x2={hoverPoint.x}
            y1={lastPoint.y}
            y2={hoverPoint.y}
          />
        )}
        {points.map((point, index) => (
          <circle
            className={styles.previewDot}
            cx={point.x}
            cy={point.y}
            key={`${index}-${point.x}-${point.y}`}
            r="4"
          />
        ))}
      </svg>
      {points.map((point, index) => (
        <span
          className={sharedStyles.pointLabel}
          key={`label-${index}-${point.x}-${point.y}`}
          style={{ left: `${point.x}px`, top: `${point.y}px` }}
        >
          {index + 1}
        </span>
      ))}
    </>
  );
}

export { PointSelectionPreview };
