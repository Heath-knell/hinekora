import type { RefObject } from "react";
import { useEffect, useRef } from "react";

import type { ClipPreviewTrimRange } from "../../ClipPreviewOverlay.utils/ClipPreviewOverlay.utils";
import type { ClipPreviewPlaybackPresentationMetrics } from "../useClipPreviewOverlayPlayback/useClipPreviewOverlayPlayback";
import {
  createMediaSnapshot,
  readVideoFrameCounts,
  roundDiagnosticNumber,
  writeClipPreviewDiagnostic,
} from "./useClipPreviewOverlayDiagnostics.utils";

const playbackHealthIntervalMs = 1_000;
const trimDiagnosticDelayMs = 250;
const mediaDiagnosticThrottleMs = 500;
const mediaDiagnosticEvents = [
  "abort",
  "canplay",
  "canplaythrough",
  "emptied",
  "ended",
  "error",
  "loadeddata",
  "loadedmetadata",
  "loadstart",
  "pause",
  "play",
  "playing",
  "ratechange",
  "seeked",
  "seeking",
  "stalled",
  "suspend",
  "waiting",
] as const;

function areClipPreviewDiagnosticsEnabled(): boolean {
  const query = window.location.hash.split("?", 2)[1];
  const diagnostics = new URLSearchParams(query ?? "").get("diagnostics");
  if (diagnostics !== null) {
    return diagnostics === "1";
  }

  if (import.meta.env.MODE === "test") {
    return true;
  }

  return false;
}

interface UseClipPreviewOverlayDiagnosticsInput {
  clipId: string | null;
  clipKind: string | null;
  clipStatus: string | null;
  consumePlaybackPresentationMetrics: () => ClipPreviewPlaybackPresentationMetrics;
  durationSeconds: number;
  hasMediaSource: boolean;
  isMediaReady: boolean;
  isPlaying: boolean;
  isPreparingClip: boolean;
  isProcessing: boolean;
  trim: ClipPreviewTrimRange;
  videoRef: RefObject<HTMLVideoElement | null>;
}

function useClipPreviewOverlayDiagnostics({
  clipId,
  clipKind,
  clipStatus,
  consumePlaybackPresentationMetrics,
  durationSeconds,
  hasMediaSource,
  isMediaReady,
  isPlaying,
  isPreparingClip,
  isProcessing,
  trim,
  videoRef,
}: UseClipPreviewOverlayDiagnosticsInput): void {
  const diagnosticsEnabled = areClipPreviewDiagnosticsEnabled();
  const clipIdRef = useRef(clipId);
  const isPlayingRef = useRef(isPlaying);
  clipIdRef.current = clipId;
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    if (!diagnosticsEnabled) {
      return;
    }

    const logDocumentState = (reason: string) => {
      writeClipPreviewDiagnostic("document-state", {
        clipId: clipIdRef.current,
        focused: document.hasFocus(),
        reason,
        visibilityState: document.visibilityState,
      });
    };
    const handleVisibilityChange = () => logDocumentState("visibilitychange");
    const handleFocus = () => logDocumentState("focus");
    const handleBlur = () => logDocumentState("blur");

    writeClipPreviewDiagnostic("overlay-mounted", {
      focused: document.hasFocus(),
      visibilityState: document.visibilityState,
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      writeClipPreviewDiagnostic("overlay-unmounted", {
        clipId: clipIdRef.current,
      });
    };
  }, [diagnosticsEnabled]);

  useEffect(() => {
    if (!diagnosticsEnabled) {
      return;
    }

    writeClipPreviewDiagnostic("clip-state", {
      clipId,
      clipKind,
      clipStatus,
      duration: roundDiagnosticNumber(durationSeconds),
      hasMediaSource,
    });
  }, [
    clipId,
    clipKind,
    clipStatus,
    diagnosticsEnabled,
    durationSeconds,
    hasMediaSource,
  ]);

  useEffect(() => {
    if (!diagnosticsEnabled) {
      return;
    }

    const video = videoRef.current;
    writeClipPreviewDiagnostic("workflow-state", {
      clipId,
      isMediaReady,
      isPlaying,
      isPreparingClip,
      isProcessing,
      videoPaused: video?.paused ?? null,
      videoSeeking: video?.seeking ?? null,
    });
  }, [
    clipId,
    diagnosticsEnabled,
    isMediaReady,
    isPlaying,
    isPreparingClip,
    isProcessing,
    videoRef,
  ]);

  useEffect(() => {
    if (!diagnosticsEnabled) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      writeClipPreviewDiagnostic("trim-state", {
        clipId: clipIdRef.current,
        inSeconds: roundDiagnosticNumber(trim.inSeconds),
        outSeconds: roundDiagnosticNumber(trim.outSeconds),
      });
    }, trimDiagnosticDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [diagnosticsEnabled, trim.inSeconds, trim.outSeconds]);

  useEffect(() => {
    if (!diagnosticsEnabled) {
      return;
    }

    const video = videoRef.current;
    if (!hasMediaSource || !video) {
      writeClipPreviewDiagnostic("media-source", {
        attached: false,
        clipId,
      });
      return;
    }

    const lastMediaEventAt = new Map<string, number>();
    const handleMediaEvent = (event: Event) => {
      const now = performance.now();
      const previousEventAt = lastMediaEventAt.get(event.type);
      if (
        previousEventAt !== undefined &&
        now - previousEventAt < mediaDiagnosticThrottleMs
      ) {
        return;
      }
      lastMediaEventAt.set(event.type, now);
      writeClipPreviewDiagnostic("media-event", {
        ...createMediaSnapshot(video, clipIdRef.current),
        mediaEvent: event.type,
      });
    };
    for (const eventName of mediaDiagnosticEvents) {
      video.addEventListener(eventName, handleMediaEvent);
    }
    writeClipPreviewDiagnostic("media-source", {
      ...createMediaSnapshot(video, clipId),
      attached: true,
    });

    return () => {
      for (const eventName of mediaDiagnosticEvents) {
        video.removeEventListener(eventName, handleMediaEvent);
      }
      writeClipPreviewDiagnostic("media-source", {
        attached: false,
        clipId: clipIdRef.current,
      });
    };
  }, [clipId, diagnosticsEnabled, hasMediaSource, videoRef]);

  useEffect(() => {
    if (!diagnosticsEnabled) {
      return;
    }

    const video = videoRef.current;
    if (!hasMediaSource || !video) {
      return;
    }

    let previousSampleTimeMs = performance.now();
    let previousMediaTime = video.currentTime;
    let previousFrames = readVideoFrameCounts(video);
    const intervalId = window.setInterval(() => {
      const sampleTimeMs = performance.now();
      const wallElapsedMs = sampleTimeMs - previousSampleTimeMs;
      const mediaTime = video.currentTime;
      const mediaAdvancedMs = (mediaTime - previousMediaTime) * 1_000;
      const frames = readVideoFrameCounts(video);
      const presentation = consumePlaybackPresentationMetrics();
      const isPlaybackActive =
        isPlayingRef.current ||
        !video.paused ||
        video.seeking ||
        presentation.frameCallbacks > 0;

      if (isPlaybackActive) {
        writeClipPreviewDiagnostic("playback-health", {
          ...createMediaSnapshot(video, clipIdRef.current),
          frameCallbacks: presentation.frameCallbacks,
          droppedFrameDelta:
            frames.dropped !== null && previousFrames.dropped !== null
              ? frames.dropped - previousFrames.dropped
              : null,
          focused: document.hasFocus(),
          maxFrameCallbackGapMs: roundDiagnosticNumber(
            presentation.maxFrameCallbackGapMs,
          ),
          mediaAdvancedMs: roundDiagnosticNumber(mediaAdvancedMs),
          mediaToWallRatio:
            wallElapsedMs > 0
              ? roundDiagnosticNumber(mediaAdvancedMs / wallElapsedMs)
              : null,
          presentationUpdates: presentation.presentationUpdates,
          stateIsPlaying: isPlayingRef.current,
          totalFrameDelta:
            frames.total !== null && previousFrames.total !== null
              ? frames.total - previousFrames.total
              : null,
          visibilityState: document.visibilityState,
          wallElapsedMs: roundDiagnosticNumber(wallElapsedMs),
        });
      }

      previousSampleTimeMs = sampleTimeMs;
      previousMediaTime = mediaTime;
      previousFrames = frames;
    }, playbackHealthIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [
    consumePlaybackPresentationMetrics,
    diagnosticsEnabled,
    hasMediaSource,
    videoRef,
  ]);
}

export { useClipPreviewOverlayDiagnostics };
