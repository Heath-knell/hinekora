import {
  type ManagedRecorderStatus,
  type RecordingOutputResolution,
  type RecordingQuality,
  recordingOutputResolutionDimensions,
} from "~/types";

interface RecordingResolutionOption {
  height: number | null;
  label: string;
  shortLabel: string;
  value: RecordingOutputResolution;
  width: number | null;
}

const recordingResolutionLabels: Record<
  Exclude<RecordingOutputResolution, "native">,
  { label: string; shortLabel: string }
> = {
  "1280x720": { label: "1280 x 720 (720p)", shortLabel: "720p" },
  "1920x1080": { label: "1920 x 1080 (1080p)", shortLabel: "1080p" },
  "2560x1440": { label: "2560 x 1440 (1440p)", shortLabel: "1440p" },
  "3440x1440": {
    label: "3440 x 1440 (Ultrawide 1440p)",
    shortLabel: "Ultrawide 1440p",
  },
  "3840x2160": { label: "3840 x 2160 (4K)", shortLabel: "4K" },
};
const explicitRecordingResolutionOptions = Object.entries(
  recordingOutputResolutionDimensions,
).map(([value, dimensions]) => ({
  ...dimensions,
  ...recordingResolutionLabels[
    value as Exclude<RecordingOutputResolution, "native">
  ],
  value: value as Exclude<RecordingOutputResolution, "native">,
}));
const recordingResolutionOptions: readonly RecordingResolutionOption[] = [
  {
    height: null,
    label: "Native source",
    shortLabel: "Native",
    value: "native",
    width: null,
  },
  ...explicitRecordingResolutionOptions,
];
const recordingFpsOptions = [30, 60] as const;
const recordingQualityOptions: ReadonlyArray<{
  label: string;
  value: RecordingQuality;
}> = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "ultra", label: "Ultra" },
];

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

export {
  isManagedRecorderStatusActive,
  recordingFpsOptions,
  recordingQualityOptions,
  recordingResolutionOptions,
};
