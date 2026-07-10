import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";

import { clampClipPreviewPlaybackSeconds } from "../../ClipPreviewOverlay.utils/ClipPreviewOverlay.utils";

interface ClipPreviewPlaybackPresentationMetrics {
  frameCallbacks: number;
  maxFrameCallbackGapMs: number;
  presentationUpdates: number;
}

interface ClipPreviewPlaybackPresentationMetricsState
  extends ClipPreviewPlaybackPresentationMetrics {
  lastFrameCallbackTimeMs: number | null;
}

function useClipPreviewOverlayVideoFrames(input: {
  durationSeconds: number;
  isPlaying: boolean;
  pendingSeekSecondsRef: RefObject<number | null>;
  setPlaying: (isPlaying: boolean) => void;
  trimOutSeconds: number;
  updatePlaybackFrame: (seconds: number) => void;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const presentationMetricsRef =
    useRef<ClipPreviewPlaybackPresentationMetricsState>({
      frameCallbacks: 0,
      lastFrameCallbackTimeMs: null,
      maxFrameCallbackGapMs: 0,
      presentationUpdates: 0,
    });

  const consumePlaybackPresentationMetrics = useCallback(() => {
    const metrics = presentationMetricsRef.current;
    const snapshot: ClipPreviewPlaybackPresentationMetrics = {
      frameCallbacks: metrics.frameCallbacks,
      maxFrameCallbackGapMs: metrics.maxFrameCallbackGapMs,
      presentationUpdates: metrics.presentationUpdates,
    };
    metrics.frameCallbacks = 0;
    metrics.maxFrameCallbackGapMs = 0;
    metrics.presentationUpdates = 0;

    return snapshot;
  }, []);

  useEffect(() => {
    if (!input.isPlaying) {
      return;
    }

    const video = input.videoRef.current;
    if (!video || typeof video.requestVideoFrameCallback !== "function") {
      return;
    }

    let videoFrameCallbackId: number | null = null;
    presentationMetricsRef.current.lastFrameCallbackTimeMs = null;
    const renderPresentedFrame: VideoFrameRequestCallback = (
      timeMs,
      metadata,
    ) => {
      if (video.paused || video.ended) {
        videoFrameCallbackId = null;
        return;
      }

      const metrics = presentationMetricsRef.current;
      metrics.frameCallbacks += 1;
      if (metrics.lastFrameCallbackTimeMs !== null) {
        metrics.maxFrameCallbackGapMs = Math.max(
          metrics.maxFrameCallbackGapMs,
          timeMs - metrics.lastFrameCallbackTimeMs,
        );
      }
      metrics.lastFrameCallbackTimeMs = timeMs;
      metrics.presentationUpdates += 1;
      const pendingSeekSeconds = input.pendingSeekSecondsRef.current;
      if (pendingSeekSeconds !== null) {
        if (!video.seeking) {
          input.pendingSeekSecondsRef.current = null;
          input.updatePlaybackFrame(
            clampClipPreviewPlaybackSeconds(
              metadata.mediaTime,
              input.durationSeconds,
            ),
          );
        } else {
          input.updatePlaybackFrame(pendingSeekSeconds);
        }
      } else if (!video.seeking) {
        const presentedSeconds = clampClipPreviewPlaybackSeconds(
          metadata.mediaTime,
          input.durationSeconds,
        );
        if (presentedSeconds >= input.trimOutSeconds) {
          input.updatePlaybackFrame(input.trimOutSeconds);
          video.pause();
          input.setPlaying(false);
          videoFrameCallbackId = null;
          return;
        }

        input.updatePlaybackFrame(presentedSeconds);
      }
      videoFrameCallbackId =
        video.requestVideoFrameCallback(renderPresentedFrame);
    };

    videoFrameCallbackId =
      video.requestVideoFrameCallback(renderPresentedFrame);

    return () => {
      presentationMetricsRef.current.lastFrameCallbackTimeMs = null;
      if (videoFrameCallbackId !== null) {
        video.cancelVideoFrameCallback(videoFrameCallbackId);
      }
    };
  }, [
    input.durationSeconds,
    input.isPlaying,
    input.pendingSeekSecondsRef,
    input.setPlaying,
    input.trimOutSeconds,
    input.updatePlaybackFrame,
    input.videoRef,
  ]);

  return { consumePlaybackPresentationMetrics };
}

export type { ClipPreviewPlaybackPresentationMetrics };
export { useClipPreviewOverlayVideoFrames };
