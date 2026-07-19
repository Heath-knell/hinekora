import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { AuraLabelSettings } from "~/types";
import styles from "../AuraOverlayPlacement/AuraOverlayPlacement.module.css";

interface AuraPlacementNameFieldProps {
  label: string;
  onCommit: (label: string) => void;
}

function AuraPlacementNameField({
  label,
  onCommit,
}: AuraPlacementNameFieldProps) {
  const [draft, setDraft] = useState(label);
  const cancelBlurCommitRef = useRef(false);

  useEffect(() => {
    setDraft(label);
  }, [label]);

  const commitDraft = () => {
    const nextLabel = draft.trim();
    if (nextLabel.length === 0 || nextLabel === label) {
      setDraft(label);
      return;
    }

    onCommit(nextLabel);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.currentTarget.value);
  };

  const handleBlur = () => {
    if (cancelBlurCommitRef.current) {
      cancelBlurCommitRef.current = false;
      return;
    }

    commitDraft();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      cancelBlurCommitRef.current = true;
      setDraft(label);
      event.currentTarget.blur();
    }
  };

  return (
    <label
      className={`${styles.propertiesField} ${styles.propertiesNameField}`}
    >
      Name
      <input
        className={styles.propertiesInput}
        maxLength={AuraLabelSettings.maxLength}
        name="label"
        type="text"
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </label>
  );
}

export { AuraPlacementNameField };
