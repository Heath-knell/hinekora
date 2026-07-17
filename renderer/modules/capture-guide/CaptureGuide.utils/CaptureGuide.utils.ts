import {
  type ManagedRecordingStorageEstimateConfiguration,
  managedRecordingStorageEstimateDurations,
} from "~/main/modules/managed-recorder/ManagedRecorder.dto";
import { recordingResolutionOptions } from "~/renderer/modules/managed-recorder/ManagedRecorder.utils/ManagedRecorder.utils";

import {
  type CaptureProfileSettingsUpdate,
  type ExplicitRecordingOutputResolution,
  type RecordingEncoderChoice,
  type RecordingQuality,
  recordingEncoderStorageFactors,
} from "~/types";

interface CaptureTemplateSettings extends CaptureProfileSettingsUpdate {
  recordingClipQuality: RecordingQuality;
  recordingEncoder: RecordingEncoderChoice;
  recordingFps: 30 | 60;
  recordingOutputResolution: ExplicitRecordingOutputResolution;
  recordingRunQuality: RecordingQuality;
}

interface CaptureTemplate {
  bestFor: string;
  description: string;
  id: string;
  isRecommended?: boolean;
  name: string;
  profileName: string;
  settings: CaptureTemplateSettings;
}

interface CaptureFormatOption {
  compatibility: string;
  fileSize: string;
  gamingLoad: string;
  label: string;
  summary: string;
  technicalName: string;
  value: RecordingEncoderChoice;
}

const captureEstimateDurations = managedRecordingStorageEstimateDurations;

function formatCaptureFormatStorageSize(
  encoder: RecordingEncoderChoice,
): string {
  const storageFactor = recordingEncoderStorageFactors[encoder];
  if (storageFactor >= 1) {
    return "Standard";
  }

  return `About ${Math.round((1 - storageFactor) * 100)}% smaller`;
}

const captureMotionOptions = [
  {
    description: "Good for long sessions and slower-paced play.",
    label: "Standard",
    value: 30,
  },
  {
    description: "Smoother movement for fast gameplay and clips.",
    label: "Smooth",
    value: 60,
  },
] as const;

const captureQualityOptions: ReadonlyArray<{
  label: string;
  value: RecordingQuality;
}> = [
  { label: "Space saving", value: "low" },
  { label: "Balanced", value: "moderate" },
  { label: "High detail", value: "high" },
  { label: "Maximum", value: "ultra" },
];

const captureFormatOptions: readonly CaptureFormatOption[] = [
  {
    compatibility: "Works nearly everywhere",
    fileSize: formatCaptureFormatStorageSize("hardware_h264"),
    gamingLoad: "Low",
    label: "Easy to share (H.264)",
    summary: "The safest choice for sharing and editing recordings.",
    technicalName: "Hardware H.264",
    value: "hardware_h264",
  },
  {
    compatibility: "Works with most newer apps",
    fileSize: formatCaptureFormatStorageSize("hardware_h265"),
    gamingLoad: "Low",
    label: "Smaller files (H.265)",
    summary:
      "A good choice for long sessions when your graphics card supports it.",
    technicalName: "Hardware H.265 / HEVC",
    value: "hardware_h265",
  },
  {
    compatibility: "Best with recent apps",
    fileSize: formatCaptureFormatStorageSize("hardware_av1"),
    gamingLoad: "Low",
    label: "Smallest files (AV1)",
    summary: "The smallest files, but it requires a newer graphics card.",
    technicalName: "Hardware AV1",
    value: "hardware_av1",
  },
  {
    compatibility: "Works nearly everywhere",
    fileSize: formatCaptureFormatStorageSize("obs_x264"),
    gamingLoad: "High",
    label: "Processor fallback (H.264)",
    summary: "A fallback that can reduce game performance while recording.",
    technicalName: "Software H.264 (OBS x264)",
    value: "obs_x264",
  },
];

const captureResolutionNames: Record<string, string> = {
  "1280x720": "HD (720p)",
  "1920x1080": "Full HD (1080p)",
  "2560x1440": "Sharp (1440p)",
  "3440x1440": "Ultrawide (1440p)",
  "3840x2160": "Ultra HD (4K)",
};

const captureResolutionGuideOptions = recordingResolutionOptions
  .filter(
    (
      option,
    ): option is (typeof recordingResolutionOptions)[number] & {
      height: number;
      width: number;
    } => option.height !== null && option.width !== null,
  )
  .map((option) => ({
    ...option,
    displayName: captureResolutionNames[option.value] ?? option.shortLabel,
  }));

const captureTemplates: readonly CaptureTemplate[] = [
  {
    bestFor: "Long sessions and limited storage",
    description: "Clear HD video with small files and standard motion.",
    id: "long-sessions",
    name: "Long sessions",
    profileName: "Long Sessions 720p",
    settings: {
      recordingClipQuality: "low",
      recordingEncoder: "hardware_h265",
      recordingFps: 30,
      recordingOutputResolution: "1280x720",
      recordingRunQuality: "low",
    },
  },
  {
    bestFor: "Most players",
    description: "Smooth Full HD video that is easy to share and edit.",
    id: "everyday-recording",
    isRecommended: true,
    name: "Everyday recording",
    profileName: "Everyday Recording 1080p",
    settings: {
      recordingClipQuality: "moderate",
      recordingEncoder: "hardware_h264",
      recordingFps: 60,
      recordingOutputResolution: "1920x1080",
      recordingRunQuality: "moderate",
    },
  },
  {
    bestFor: "Readable details and high-resolution displays",
    description: "Sharper video with smooth movement and smaller files.",
    id: "sharp-gameplay",
    name: "Sharp gameplay",
    profileName: "Sharp Gameplay 1440p",
    settings: {
      recordingClipQuality: "high",
      recordingEncoder: "hardware_h265",
      recordingFps: 60,
      recordingOutputResolution: "2560x1440",
      recordingRunQuality: "high",
    },
  },
  {
    bestFor: "Powerful, recent PCs with plenty of storage",
    description: "The clearest picture and smoothest motion available.",
    id: "maximum-detail",
    name: "Maximum detail",
    profileName: "Maximum Detail 4K",
    settings: {
      recordingClipQuality: "ultra",
      recordingEncoder: "hardware_av1",
      recordingFps: 60,
      recordingOutputResolution: "3840x2160",
      recordingRunQuality: "ultra",
    },
  },
];

const captureStorageEstimateKey = "capture-storage-planner";
function getCaptureTemplateEstimateKey(templateId: string): string {
  return `capture-template:${templateId}`;
}
const captureTemplateEstimateConfigurations: ManagedRecordingStorageEstimateConfiguration[] =
  captureTemplates.map((template) => ({
    durationMinutes: 60,
    encoder: template.settings.recordingEncoder,
    fps: template.settings.recordingFps,
    key: getCaptureTemplateEstimateKey(template.id),
    quality: template.settings.recordingRunQuality,
    resolution: template.settings.recordingOutputResolution,
  }));

const bytesPerMegabyte = 1_000_000;
const bytesPerGigabyte = 1_000_000_000;

function formatEstimatedRecordingStorage(bytes: number): string {
  if (bytes >= bytesPerGigabyte) {
    const gigabytes = bytes / bytesPerGigabyte;

    return `${gigabytes < 10 ? gigabytes.toFixed(1) : Math.round(gigabytes)} GB`;
  }

  return `${Math.max(1, Math.round(bytes / bytesPerMegabyte))} MB`;
}

function getCaptureMotionLabel(fps: number): string {
  const option = captureMotionOptions.find((item) => item.value === fps);

  return option ? `${option.label} (${fps} fps)` : `${fps} fps`;
}

function getCaptureFormatShortLabel(encoder: RecordingEncoderChoice): string {
  switch (encoder) {
    case "hardware_av1":
      return "AV1";
    case "hardware_h265":
      return "H.265";
    case "hardware_h264":
      return "H.264";
    case "obs_x264":
      return "x264";
  }
}

export {
  captureEstimateDurations,
  captureFormatOptions,
  captureMotionOptions,
  captureQualityOptions,
  captureResolutionGuideOptions,
  captureStorageEstimateKey,
  captureTemplateEstimateConfigurations,
  captureTemplates,
  formatEstimatedRecordingStorage,
  getCaptureFormatShortLabel,
  getCaptureMotionLabel,
  getCaptureTemplateEstimateKey,
};
