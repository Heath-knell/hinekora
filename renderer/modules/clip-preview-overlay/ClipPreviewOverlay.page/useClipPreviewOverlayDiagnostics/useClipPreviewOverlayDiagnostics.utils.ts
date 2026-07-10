import type {
  ClipPreviewDiagnosticEvent,
  ClipPreviewDiagnosticFieldValue,
} from "~/main/modules/diag-log/DiagLog.dto";

interface VideoFrameCounts {
  dropped: number | null;
  total: number | null;
}

function roundDiagnosticNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function writeClipPreviewDiagnostic(
  event: ClipPreviewDiagnosticEvent,
  fields?: Record<string, ClipPreviewDiagnosticFieldValue>,
): void {
  try {
    window.electron.diagLog.writeClipPreviewEvent({
      event,
      ...(fields ? { fields } : {}),
    });
  } catch {
    // Diagnostics must never interfere with preview playback.
  }
}

function readVideoFrameCounts(video: HTMLVideoElement): VideoFrameCounts {
  try {
    if (typeof video.getVideoPlaybackQuality === "function") {
      const quality = video.getVideoPlaybackQuality();
      return {
        dropped: quality.droppedVideoFrames,
        total: quality.totalVideoFrames,
      };
    }

    const dropped = Reflect.get(video, "webkitDroppedFrameCount");
    const total = Reflect.get(video, "webkitDecodedFrameCount");
    return {
      dropped: typeof dropped === "number" ? dropped : null,
      total: typeof total === "number" ? total : null,
    };
  } catch {
    return { dropped: null, total: null };
  }
}

function readBufferedAheadMs(video: HTMLVideoElement): number {
  try {
    const currentTime = video.currentTime;
    for (let index = 0; index < video.buffered.length; index += 1) {
      if (
        currentTime >= video.buffered.start(index) - 0.05 &&
        currentTime <= video.buffered.end(index) + 0.05
      ) {
        return roundDiagnosticNumber(
          Math.max(0, video.buffered.end(index) - currentTime) * 1_000,
        );
      }
    }
  } catch {
    return 0;
  }

  return 0;
}

function createMediaSnapshot(
  video: HTMLVideoElement,
  clipId: string | null,
): Record<string, ClipPreviewDiagnosticFieldValue> {
  const frames = readVideoFrameCounts(video);
  return {
    bufferedAheadMs: readBufferedAheadMs(video),
    bufferedRanges: video.buffered.length,
    clipId,
    currentTime: roundDiagnosticNumber(video.currentTime),
    droppedFrames: frames.dropped,
    duration: Number.isFinite(video.duration)
      ? roundDiagnosticNumber(video.duration)
      : null,
    ended: video.ended,
    errorCode: video.error?.code ?? null,
    errorMessage: video.error?.message ?? null,
    networkState: video.networkState,
    paused: video.paused,
    playbackRate: video.playbackRate,
    readyState: video.readyState,
    seeking: video.seeking,
    totalFrames: frames.total,
    videoHeight: video.videoHeight,
    videoWidth: video.videoWidth,
  };
}

export {
  createMediaSnapshot,
  readVideoFrameCounts,
  roundDiagnosticNumber,
  writeClipPreviewDiagnostic,
};
