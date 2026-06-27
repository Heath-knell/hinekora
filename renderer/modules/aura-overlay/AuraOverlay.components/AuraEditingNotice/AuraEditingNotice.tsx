import { FiLock, FiMoon, FiMousePointer, FiPlusSquare } from "react-icons/fi";

import { useAuraOverlayShallow } from "~/renderer/store";

import { AuraOverlayControlsHelp } from "../AuraOverlayControlsHelp/AuraOverlayControlsHelp";
import styles from "./AuraEditingNotice.module.css";

interface AuraEditingNoticeProps {
  canAddAura: boolean;
  onAddAura: () => void;
  onAddArchedAura: () => void;
  onAddPointerAura: () => void;
  onLockAuras: () => void;
}

function AuraEditingNotice({
  canAddAura,
  onAddAura,
  onAddArchedAura,
  onAddPointerAura,
  onLockAuras,
}: AuraEditingNoticeProps) {
  const addingAuraShape = useAuraOverlayShallow(
    (auraOverlay) => auraOverlay.addingAuraShape,
  );
  const addingAura = addingAuraShape !== null;

  return (
    <div className={styles.editingDock}>
      <div className={styles.editingNotice} role="status">
        <div className={styles.editingText}>
          <span className={styles.editingTitle}>Currently editing auras</span>
          <span className={styles.editingNote}>
            Add auras or lock to regain game control.
          </span>
        </div>
        <div className={styles.editingActions}>
          <button
            className={styles.addButton}
            disabled={!canAddAura || addingAura}
            type="button"
            onClick={onAddAura}
          >
            <FiPlusSquare size={14} />
            <span>
              {addingAuraShape === "rect" ? "Selecting..." : "Add new aura"}
            </span>
          </button>
          <button
            className={styles.addButton}
            disabled={!canAddAura || addingAura}
            type="button"
            onClick={onAddArchedAura}
          >
            <FiMoon size={14} />
            <span>
              {addingAuraShape === "arc" ? "Selecting..." : "Add arched aura"}
            </span>
          </button>
          <button
            className={styles.addButton}
            disabled={!canAddAura || addingAura}
            type="button"
            onClick={onAddPointerAura}
          >
            <FiMousePointer size={14} />
            <span>
              {addingAuraShape === "points"
                ? "Selecting..."
                : "Add pointer aura"}
            </span>
          </button>
          <button
            className={styles.lockButton}
            disabled={addingAura}
            type="button"
            onClick={onLockAuras}
          >
            <FiLock size={14} />
            <span>Lock auras</span>
          </button>
        </div>
      </div>
      <AuraOverlayControlsHelp />
    </div>
  );
}

export { AuraEditingNotice };
