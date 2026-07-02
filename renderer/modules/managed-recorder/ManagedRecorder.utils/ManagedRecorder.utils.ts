import type { ManagedRecorderStatus } from "~/types";

function isManagedRecorderStatusActive(
  status: ManagedRecorderStatus | null | undefined,
): boolean {
  return (
    status?.bufferActive === true ||
    status?.runRecordingActive === true ||
    status?.recording === true ||
    status?.isStartingRecording === true ||
    status?.isStoppingRecording === true
  );
}

export { isManagedRecorderStatusActive };
