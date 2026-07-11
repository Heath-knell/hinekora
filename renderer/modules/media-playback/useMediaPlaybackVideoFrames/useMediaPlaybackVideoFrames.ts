import type { RefObject } from "react";
import { useEffect } from "react";

const presentedSeekToleranceSeconds = 0.25;
const maxSettledSeekFrameMisses = 1;

interface PendingMediaPlaybackSeek {
  seconds: number;
  settledFrameMisses: number;
}

interface UseMediaPlaybackVideoFramesInput {
  isPlaying: boolean;
  mediaUrl: string | null;
  pendingSeekRef: RefObject<PendingMediaPlaybackSeek | null>;
  publishPlaybackSeconds: (seconds: number) => void;
  syncPlaybackPosition: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
}

function useMediaPlaybackVideoFrames({
  isPlaying,
  mediaUrl,
  pendingSeekRef,
  publishPlaybackSeconds,
  syncPlaybackPosition,
  videoRef,
}: UseMediaPlaybackVideoFramesInput) {
  useEffect(() => {
    if (!isPlaying || !mediaUrl) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    let animationFrameId: number | null = null;
    let videoFrameCallbackId: number | null = null;
    let isActive = true;

    if (typeof video.requestVideoFrameCallback === "function") {
      const publishPresentedFrame: VideoFrameRequestCallback = (
        _now,
        metadata,
      ) => {
        if (!isActive) {
          return;
        }

        const pendingSeek = pendingSeekRef.current;
        if (pendingSeek !== null) {
          const hasPresentedSeekDestination =
            !video.seeking &&
            Math.abs(metadata.mediaTime - pendingSeek.seconds) <=
              presentedSeekToleranceSeconds;
          const hasExceededSettledFrameGrace =
            !video.seeking &&
            pendingSeek.settledFrameMisses >= maxSettledSeekFrameMisses;
          if (hasPresentedSeekDestination || hasExceededSettledFrameGrace) {
            pendingSeekRef.current = null;
            publishPlaybackSeconds(metadata.mediaTime);
          } else {
            if (!video.seeking) {
              pendingSeek.settledFrameMisses += 1;
            }
            publishPlaybackSeconds(pendingSeek.seconds);
          }
        } else if (!video.seeking) {
          publishPlaybackSeconds(metadata.mediaTime);
        }
        videoFrameCallbackId = video.requestVideoFrameCallback(
          publishPresentedFrame,
        );
      };

      videoFrameCallbackId = video.requestVideoFrameCallback(
        publishPresentedFrame,
      );
    } else {
      const publishAnimationFrame = () => {
        if (!isActive) {
          return;
        }

        syncPlaybackPosition();
        animationFrameId = window.requestAnimationFrame(publishAnimationFrame);
      };

      animationFrameId = window.requestAnimationFrame(publishAnimationFrame);
    }

    return () => {
      isActive = false;
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (videoFrameCallbackId !== null) {
        video.cancelVideoFrameCallback(videoFrameCallbackId);
      }
    };
  }, [
    isPlaying,
    mediaUrl,
    pendingSeekRef,
    publishPlaybackSeconds,
    syncPlaybackPosition,
    videoRef,
  ]);
}

export type { PendingMediaPlaybackSeek };
export { useMediaPlaybackVideoFrames };
