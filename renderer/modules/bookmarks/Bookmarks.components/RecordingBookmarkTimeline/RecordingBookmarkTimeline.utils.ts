import {
  calculateTimelineMarkers,
  calculateTimelineMinorMarkers,
  calculateTimelinePercent,
  clampTimelineSeconds,
  formatTimelineRailLeft,
  formatTimelineRailWidth,
  type MediaClipTargetSegment,
  resolveMediaClipTargetSegment,
  resolveTimelineSecondsFromClientX,
} from "~/renderer/modules/media-playback/MediaTimeline.utils/MediaTimeline.utils";

const recordingTimelineRailPaddingPixels = 24;

interface ResolveRecordingTimelineSecondsFromClientXInput {
  clientX: number;
  durationSeconds: number;
  timelineGrid: HTMLElement | null;
}

type RecordingClipTargetRulerSegment = MediaClipTargetSegment;

function calculateRecordingTimelinePercent(
  seconds: number | null,
  durationSeconds: number,
): number {
  return calculateTimelinePercent(seconds, durationSeconds);
}

function calculateRecordingTimelineMarkers(durationSeconds: number): number[] {
  return calculateTimelineMarkers(durationSeconds);
}

function calculateRecordingTimelineMinorMarkers(
  durationSeconds: number,
): number[] {
  return calculateTimelineMinorMarkers(durationSeconds);
}

function formatRecordingTimelineRailLeft(percent: number): string {
  return formatTimelineRailLeft(percent, recordingTimelineRailPaddingPixels);
}

function formatRecordingTimelineRailWidth(percent: number): string {
  return formatTimelineRailWidth(percent, recordingTimelineRailPaddingPixels);
}

function formatRecordingTimelineMarker(seconds: number): string {
  return formatRecordingTimelineTime(seconds);
}

function formatRecordingTimelineTimestamp(
  seconds: number | null | undefined,
): string {
  if (
    typeof seconds !== "number" ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "0:00.00";
  }

  const roundedCentiseconds = Math.round(seconds * 100);
  const minutes = Math.floor(roundedCentiseconds / 6_000);
  const remainingCentiseconds = roundedCentiseconds % 6_000;
  const wholeSeconds = Math.floor(remainingCentiseconds / 100);
  const centiseconds = remainingCentiseconds % 100;

  return `${minutes}:${wholeSeconds.toString().padStart(2, "0")}.${centiseconds
    .toString()
    .padStart(2, "0")}`;
}

function formatRecordingTimelineTime(
  seconds: number | null | undefined,
): string {
  if (
    typeof seconds !== "number" ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "0:00";
  }

  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function clampRecordingTimelineSeconds(
  seconds: number,
  durationSeconds: number,
): number {
  return clampTimelineSeconds(seconds, durationSeconds);
}

function resolveRecordingClipTargetRulerSegment(input: {
  durationSeconds: number | null;
  offsetSeconds: number | null;
  targetDurationSeconds: number | null;
}): RecordingClipTargetRulerSegment | null {
  return resolveMediaClipTargetSegment(input);
}

function resolveRecordingTimelineSecondsFromClientX({
  clientX,
  durationSeconds,
  timelineGrid,
}: ResolveRecordingTimelineSecondsFromClientXInput): number | null {
  return resolveTimelineSecondsFromClientX({
    clientX,
    durationSeconds,
    railPaddingPixels: recordingTimelineRailPaddingPixels,
    timelineGrid,
  });
}

export type { RecordingClipTargetRulerSegment };
export {
  calculateRecordingTimelineMarkers,
  calculateRecordingTimelineMinorMarkers,
  calculateRecordingTimelinePercent,
  clampRecordingTimelineSeconds,
  formatRecordingTimelineMarker,
  formatRecordingTimelineRailLeft,
  formatRecordingTimelineRailWidth,
  formatRecordingTimelineTime,
  formatRecordingTimelineTimestamp,
  recordingTimelineRailPaddingPixels,
  resolveRecordingClipTargetRulerSegment,
  resolveRecordingTimelineSecondsFromClientX,
};
