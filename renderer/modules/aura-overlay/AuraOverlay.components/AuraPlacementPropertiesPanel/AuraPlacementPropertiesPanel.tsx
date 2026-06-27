import clsx from "clsx";
import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type { OverlayPlacement } from "~/types";
import styles from "../AuraOverlayPlacement/AuraOverlayPlacement.module.css";
import { AuraPlacementNumberField } from "../AuraPlacementNumberField/AuraPlacementNumberField";
import { AuraPlacementPointPropertiesFields } from "../AuraPlacementPointPropertiesFields/AuraPlacementPointPropertiesFields";
import { AuraPlacementPropertiesActions } from "../AuraPlacementPropertiesActions/AuraPlacementPropertiesActions";
import {
  type AuraPlacementPropertiesPanelSide,
  type AuraPlacementPropertiesPatch,
  auraPlacementBaseNumberFields,
  createCurrentNumericValues,
  createNumberFieldPatch,
  createPropertiesDraft,
  type NumberFieldName,
  normalizeNumberInputValue,
  readNumberFieldName,
  resolveNextRotationDegrees,
} from "./AuraPlacementPropertiesPanel.utils";

interface AuraPlacementPropertiesPanelProps {
  displayHeight: number;
  displayWidth: number;
  placement: OverlayPlacement;
  pointControls?: boolean;
  side: AuraPlacementPropertiesPanelSide;
  visibleThickness?: number;
  onChange: (placementId: string, patch: AuraPlacementPropertiesPatch) => void;
}

const panelSideClassNames: Record<AuraPlacementPropertiesPanelSide, string> = {
  bottom: styles.propertiesPanelBottom ?? "",
  left: styles.propertiesPanelLeft ?? "",
  right: styles.propertiesPanelRight ?? "",
  top: styles.propertiesPanelTop ?? "",
};

function AuraPlacementPropertiesPanel({
  displayHeight,
  displayWidth,
  placement,
  pointControls = false,
  side,
  visibleThickness,
  onChange,
}: AuraPlacementPropertiesPanelProps) {
  const thickness = visibleThickness ? Math.round(visibleThickness) : null;
  const activeFieldRef = useRef<NumberFieldName | null>(null);
  const historyRecordedFieldRef = useRef<NumberFieldName | null>(null);
  const [draft, setDraft] = useState(() =>
    createPropertiesDraft(displayWidth, displayHeight, placement, thickness),
  );

  useEffect(() => {
    if (activeFieldRef.current !== null) {
      return;
    }

    setDraft(
      createPropertiesDraft(displayWidth, displayHeight, placement, thickness),
    );
  }, [displayHeight, displayWidth, placement, thickness]);

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fieldName = readNumberFieldName(event.currentTarget.name);
    if (!fieldName) {
      return;
    }

    const nextValue = event.currentTarget.value;
    setDraft((currentDraft) => ({
      ...currentDraft,
      [fieldName]: nextValue,
    }));
    const shouldRecordHistory = historyRecordedFieldRef.current !== fieldName;
    const didCommit = commitNumberField(fieldName, nextValue, {
      recordHistory: shouldRecordHistory,
      resetDraftOnNoop: false,
    });
    if (didCommit && shouldRecordHistory) {
      historyRecordedFieldRef.current = fieldName;
    }
  };

  const handleNumberFocus = (event: FocusEvent<HTMLInputElement>) => {
    const fieldName = readNumberFieldName(event.currentTarget.name);
    if (!fieldName) {
      return;
    }

    activeFieldRef.current = fieldName;
    historyRecordedFieldRef.current = null;
  };

  const handleNumberBlur = (event: FocusEvent<HTMLInputElement>) => {
    const fieldName = readNumberFieldName(event.currentTarget.name);
    if (!fieldName) {
      return;
    }

    const shouldRecordHistory = historyRecordedFieldRef.current !== fieldName;
    commitNumberField(fieldName, draft[fieldName], {
      recordHistory: shouldRecordHistory,
      resetDraftOnNoop: true,
    });
    activeFieldRef.current = null;
    historyRecordedFieldRef.current = null;
  };

  const handleNumberKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const fieldName = readNumberFieldName(event.currentTarget.name);
    if (!fieldName) {
      return;
    }

    if (event.key === "Enter") {
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      setDraft(
        createPropertiesDraft(
          displayWidth,
          displayHeight,
          placement,
          thickness,
        ),
      );
      event.currentTarget.blur();
    }
  };

  const handleMirrorChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(placement.id, { mirrored: event.currentTarget.checked });
  };

  const handleStraightenChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(placement.id, { arcStraightened: event.currentTarget.checked });
  };

  const handleRotateClick = () => {
    onChange(placement.id, {
      rotationDegrees: resolveNextRotationDegrees(placement.rotationDegrees),
    });
  };

  const commitNumberField = (
    fieldName: NumberFieldName,
    value: string,
    {
      recordHistory,
      resetDraftOnNoop,
    }: { recordHistory: boolean; resetDraftOnNoop: boolean },
  ): boolean => {
    const currentValue = createCurrentNumericValues(
      displayWidth,
      displayHeight,
      placement,
      thickness,
    )[fieldName];
    const normalizedValue = normalizeNumberInputValue(fieldName, value);
    if (
      normalizedValue === null ||
      (currentValue !== null &&
        Math.abs(normalizedValue - currentValue) < Number.EPSILON)
    ) {
      if (resetDraftOnNoop) {
        setDraft(
          createPropertiesDraft(
            displayWidth,
            displayHeight,
            placement,
            thickness,
          ),
        );
      }
      return false;
    }

    onChange(
      placement.id,
      createNumberFieldPatch(fieldName, normalizedValue, recordHistory),
    );
    return true;
  };

  return (
    <section
      aria-label="Aura placement properties"
      className={clsx(styles.propertiesPanel, panelSideClassNames[side])}
    >
      {auraPlacementBaseNumberFields.map((field) => (
        <AuraPlacementNumberField
          key={field.name}
          {...field}
          value={draft[field.name]}
          onChange={handleNumberChange}
          onBlur={handleNumberBlur}
          onFocus={handleNumberFocus}
          onKeyDown={handleNumberKeyDown}
        />
      ))}
      {thickness !== null && (
        <AuraPlacementNumberField
          label="Thickness"
          min="1"
          name="thickness"
          value={draft.thickness}
          onChange={handleNumberChange}
          onBlur={handleNumberBlur}
          onFocus={handleNumberFocus}
          onKeyDown={handleNumberKeyDown}
        />
      )}
      {pointControls && (
        <AuraPlacementPointPropertiesFields
          draft={draft}
          onChange={handleNumberChange}
          onBlur={handleNumberBlur}
          onFocus={handleNumberFocus}
          onKeyDown={handleNumberKeyDown}
        />
      )}
      <AuraPlacementPropertiesActions
        arcStraightened={placement.arcStraightened === true}
        canStraighten={thickness !== null}
        mirrored={placement.mirrored === true}
        rotationDegrees={placement.rotationDegrees ?? 0}
        onMirrorChange={handleMirrorChange}
        onRotateClick={handleRotateClick}
        onStraightenChange={handleStraightenChange}
      />
    </section>
  );
}

export type { AuraPlacementPropertiesPanelSide, AuraPlacementPropertiesPatch };
export { AuraPlacementPropertiesPanel };
