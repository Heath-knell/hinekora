import { describe, expect, it } from "vitest";

import {
  captureEstimateDurations,
  captureFormatOptions,
  captureResolutionGuideOptions,
  captureTemplateEstimateConfigurations,
  captureTemplates,
  formatEstimatedRecordingStorage,
  getCaptureFormatShortLabel,
  getCaptureMotionLabel,
} from "./CaptureGuide.utils";

describe("CaptureGuide utilities", () => {
  it("covers every requested duration and explicit capture resolution", () => {
    expect(
      captureEstimateDurations.map((duration) => duration.minutes),
    ).toEqual([10, 30, 60, 120, 300, 600, 960, 1_440]);
    expect(captureResolutionGuideOptions.map((option) => option.value)).toEqual(
      ["1280x720", "1920x1080", "2560x1440", "3440x1440", "3840x2160"],
    );
    expect(captureResolutionGuideOptions[0]?.displayName).toBe("HD (720p)");
    expect(captureResolutionGuideOptions[1]?.displayName).toBe(
      "Full HD (1080p)",
    );
  });

  it("formats compact storage, motion, and format labels", () => {
    expect(formatEstimatedRecordingStorage(450_000_000)).toBe("450 MB");
    expect(formatEstimatedRecordingStorage(2_786_400_000)).toBe("2.8 GB");
    expect(formatEstimatedRecordingStorage(12_600_000_000)).toBe("13 GB");
    expect(formatEstimatedRecordingStorage(0)).toBe("1 MB");
    expect(getCaptureMotionLabel(30)).toBe("Standard (30 fps)");
    expect(getCaptureMotionLabel(60)).toBe("Smooth (60 fps)");
    expect(getCaptureMotionLabel(120)).toBe("120 fps");
    expect(getCaptureFormatShortLabel("hardware_h264")).toBe("H.264");
    expect(getCaptureFormatShortLabel("hardware_h265")).toBe("H.265");
    expect(getCaptureFormatShortLabel("hardware_av1")).toBe("AV1");
    expect(getCaptureFormatShortLabel("obs_x264")).toBe("x264");
  });

  it("uses plain-language templates and recording format choices", () => {
    expect(captureTemplates).toHaveLength(4);
    expect(captureTemplateEstimateConfigurations).toHaveLength(4);
    expect(captureTemplateEstimateConfigurations[1]).toMatchObject({
      durationMinutes: 60,
      resolution: "1920x1080",
    });
    expect(
      captureTemplates.find((template) => template.isRecommended),
    ).toMatchObject({
      id: "everyday-recording",
      settings: {
        recordingFps: 60,
        recordingOutputResolution: "1920x1080",
      },
    });
    expect(captureFormatOptions.map((option) => option.label)).toEqual([
      "Easy to share (H.264)",
      "Smaller files (H.265)",
      "Smallest files (AV1)",
      "Processor fallback (H.264)",
    ]);
  });
});
