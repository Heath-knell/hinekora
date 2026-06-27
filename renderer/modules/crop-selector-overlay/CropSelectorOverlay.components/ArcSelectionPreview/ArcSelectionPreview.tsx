import type { CropSelectorPoint } from "~/renderer/modules/crop-selector-overlay/CropSelectorOverlay.utils/CropSelectorOverlay.utils";
import {
  createArcSelectionBoundaryPaths,
  createCircularArcCurvePoints,
  createSvgPointPath,
} from "~/renderer/modules/crop-selector-overlay/CropSelectorOverlay.utils/CropSelectorOverlay.utils";

import sharedStyles from "../SelectionPreview/SelectionPreview.module.css";
import styles from "./ArcSelectionPreview.module.css";

interface ArcSelectionPreviewProps {
  arcEnd: CropSelectorPoint | null;
  arcStart: CropSelectorPoint | null;
  hoverPoint: CropSelectorPoint | null;
}

function createMidpoint(
  start: CropSelectorPoint,
  end: CropSelectorPoint,
): CropSelectorPoint {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

function ArcSelectionPreview({
  arcEnd,
  arcStart,
  hoverPoint,
}: ArcSelectionPreviewProps) {
  const arcControlPoint =
    arcStart && arcEnd
      ? (hoverPoint ?? createMidpoint(arcStart, arcEnd))
      : null;
  const arcPreviewPoints =
    arcStart && arcEnd && arcControlPoint
      ? createCircularArcCurvePoints(arcStart, arcEnd, arcControlPoint)
      : [];
  const arcPreviewPath =
    arcPreviewPoints.length > 0 ? createSvgPointPath(arcPreviewPoints) : null;
  const arcBoundaryPaths = createArcSelectionBoundaryPaths(arcPreviewPoints);

  return (
    <>
      <svg className={sharedStyles.overlay} aria-hidden="true">
        {arcStart && hoverPoint && !arcEnd && (
          <line
            className={styles.guide}
            x1={arcStart.x}
            y1={arcStart.y}
            x2={hoverPoint.x}
            y2={hoverPoint.y}
          />
        )}
        {arcPreviewPath && (
          <path className={styles.previewPath} d={arcPreviewPath} />
        )}
        {arcBoundaryPaths && (
          <>
            <path className={styles.boundaryPath} d={arcBoundaryPaths.outer} />
            <path className={styles.boundaryPath} d={arcBoundaryPaths.inner} />
          </>
        )}
        {arcPreviewPoints.map((point, index) => (
          <circle
            className={styles.previewDot}
            cx={point.x}
            cy={point.y}
            key={`${index}-${point.x}-${point.y}`}
            r="1.5"
          />
        ))}
      </svg>
      {arcStart && (
        <span
          className={sharedStyles.pointLabel}
          style={{ left: `${arcStart.x}px`, top: `${arcStart.y}px` }}
        >
          A
        </span>
      )}
      {arcEnd && (
        <span
          className={sharedStyles.pointLabel}
          style={{ left: `${arcEnd.x}px`, top: `${arcEnd.y}px` }}
        >
          B
        </span>
      )}
      {arcControlPoint && (
        <span
          className={sharedStyles.pointLabel}
          style={{
            left: `${arcControlPoint.x}px`,
            top: `${arcControlPoint.y}px`,
          }}
        >
          C
        </span>
      )}
    </>
  );
}

export { ArcSelectionPreview };
