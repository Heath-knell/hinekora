import type { ChangeEventHandler, MouseEventHandler } from "react";

import styles from "../AuraOverlayPlacement/AuraOverlayPlacement.module.css";

interface AuraPlacementPropertiesActionsProps {
  arcStraightened: boolean;
  canStraighten: boolean;
  mirrored: boolean;
  rotationDegrees: number;
  onMirrorChange: ChangeEventHandler<HTMLInputElement>;
  onRotateClick: MouseEventHandler<HTMLButtonElement>;
  onStraightenChange: ChangeEventHandler<HTMLInputElement>;
}

function AuraPlacementPropertiesActions({
  arcStraightened,
  canStraighten,
  mirrored,
  rotationDegrees,
  onMirrorChange,
  onRotateClick,
  onStraightenChange,
}: AuraPlacementPropertiesActionsProps) {
  return (
    <div className={styles.propertiesActions}>
      <label className={styles.propertiesToggle}>
        <input checked={mirrored} type="checkbox" onChange={onMirrorChange} />
        Mirror
      </label>
      {canStraighten && (
        <label className={styles.propertiesToggle}>
          <input
            checked={arcStraightened}
            type="checkbox"
            onChange={onStraightenChange}
          />
          Straighten
        </label>
      )}
      <button
        className={styles.propertiesButton}
        type="button"
        onClick={onRotateClick}
      >
        Rotate {rotationDegrees}deg
      </button>
    </div>
  );
}

export { AuraPlacementPropertiesActions };
