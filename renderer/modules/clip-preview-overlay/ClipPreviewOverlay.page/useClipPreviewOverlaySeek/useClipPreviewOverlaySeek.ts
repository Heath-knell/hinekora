import type { RefObject } from "react";

import {
  clampClipPreviewPlaybackSeconds,
  roundClipPreviewSeconds,
} from "../../ClipPreviewOverlay.utils/ClipPreviewOverlay.utils";

interface SeekPreviewOptions {
  preservePlayback?: boolean;
}

function useClipPreviewOverlaySeek(input: {
  canUseClip: boolean;
  durationSeconds: number;
  pendingSeekSecondsRef: RefObject<number | null>;
  resumePlaybackAfterSeekRef: RefObject<boolean>;
  setPlaying: (isPlaying: boolean) => void;
  syncPlaybackPresentation: (seconds?: number) => void;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const seekPreview = (seconds: number, options?: SeekPreviewOptions) => {
    const nextSeconds = clampClipPreviewPlaybackSeconds(
      seconds,
      input.durationSeconds,
    );
    const video = input.videoRef.current;
    input.pendingSeekSecondsRef.current = nextSeconds;
    const shouldResumePlayback =
      options?.preservePlayback === true &&
      Boolean(
        video &&
          input.canUseClip &&
          (input.resumePlaybackAfterSeekRef.current || !video.paused),
      );
    input.resumePlaybackAfterSeekRef.current = shouldResumePlayback;

    if (video && !video.paused) {
      video.pause();
    }
    input.setPlaying(false);
    input.syncPlaybackPresentation(nextSeconds);
    const resumeImmediately = () => {
      if (!input.resumePlaybackAfterSeekRef.current || !video) {
        return;
      }

      input.resumePlaybackAfterSeekRef.current = false;
      void video.play().catch((error: unknown) => {
        console.warn("[clip-preview] Could not resume preview", { error });
        input.setPlaying(false);
      });
    };
    if (
      video &&
      input.canUseClip &&
      video.readyState >= HTMLMediaElement.HAVE_METADATA
    ) {
      if (Math.abs(video.currentTime - nextSeconds) < 0.01) {
        clearPendingSeek(input.pendingSeekSecondsRef, nextSeconds);
        resumeImmediately();
      } else {
        video.currentTime = nextSeconds;
      }
    } else {
      clearPendingSeek(input.pendingSeekSecondsRef, nextSeconds);
      resumeImmediately();
    }
  };

  const handleSeeking = () => {
    const pendingSeconds = input.pendingSeekSecondsRef.current;
    if (pendingSeconds !== null) {
      input.syncPlaybackPresentation(pendingSeconds);
    }
  };

  const handleSeeked = () => {
    const video = input.videoRef.current;
    const pendingSeconds = input.pendingSeekSecondsRef.current;
    if (pendingSeconds !== null) {
      input.syncPlaybackPresentation(pendingSeconds);
      if (!video) {
        input.pendingSeekSecondsRef.current = null;
        input.resumePlaybackAfterSeekRef.current = false;
      } else if (input.resumePlaybackAfterSeekRef.current) {
        input.resumePlaybackAfterSeekRef.current = false;
        void video.play().catch((error: unknown) => {
          input.pendingSeekSecondsRef.current = null;
          console.warn("[clip-preview] Could not resume preview", { error });
          input.setPlaying(false);
        });
      } else if (Math.abs(video.currentTime - pendingSeconds) < 0.1) {
        input.pendingSeekSecondsRef.current = null;
      }
    } else if (video) {
      input.syncPlaybackPresentation(
        roundClipPreviewSeconds(video.currentTime),
      );
    }
  };

  return { handleSeeked, handleSeeking, seekPreview };
}

function clearPendingSeek(
  pendingSeekSecondsRef: RefObject<number | null>,
  seconds: number,
): void {
  if (
    pendingSeekSecondsRef.current !== null &&
    Math.abs(pendingSeekSecondsRef.current - seconds) < 0.01
  ) {
    pendingSeekSecondsRef.current = null;
  }
}

export { useClipPreviewOverlaySeek };
