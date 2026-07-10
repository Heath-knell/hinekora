import type { RefObject, SyntheticEvent } from "react";
import { useEffect, useRef } from "react";

import { trackEvent } from "~/renderer/modules/umami";

import {
  type ClipPreviewTrimRange,
  roundClipPreviewSeconds,
} from "../../ClipPreviewOverlay.utils/ClipPreviewOverlay.utils";
import { useClipPreviewOverlaySeek } from "../useClipPreviewOverlaySeek/useClipPreviewOverlaySeek";
import {
  type ClipPreviewPlaybackPresentationMetrics,
  useClipPreviewOverlayVideoFrames,
} from "../useClipPreviewOverlayVideoFrames/useClipPreviewOverlayVideoFrames";

interface UseClipPreviewOverlayPlaybackInput {
  canUseClip: boolean;
  clipId: string | null;
  durationSeconds: number;
  hasUserAdjustedTrimRef: RefObject<boolean>;
  isMuted: boolean;
  isPlaying: boolean;
  setDurationOverrideSeconds: (durationOverrideSeconds: number | null) => void;
  setMediaReady: (isMediaReady: boolean) => void;
  setMediaError: (mediaError: string | null) => void;
  setMuted: (isMuted: boolean) => void;
  setPlaying: (isPlaying: boolean) => void;
  setTrim: (trim: ClipPreviewTrimRange) => void;
  syncPlaybackPresentation: (seconds?: number) => void;
  trim: ClipPreviewTrimRange;
  updatePlaybackFrame: (seconds: number) => void;
  videoSrc: string | null;
}

function seekVideo(video: HTMLVideoElement, seconds: number): void {
  video.currentTime = seconds;
}

function useClipPreviewOverlayPlayback({
  canUseClip,
  clipId,
  durationSeconds,
  hasUserAdjustedTrimRef,
  isMuted,
  isPlaying,
  setDurationOverrideSeconds,
  setMediaReady,
  setMediaError,
  setMuted,
  setPlaying,
  setTrim,
  syncPlaybackPresentation,
  trim,
  updatePlaybackFrame,
  videoSrc,
}: UseClipPreviewOverlayPlaybackInput) {
  const pendingSeekSecondsRef = useRef<number | null>(null);
  const resumePlaybackAfterSeekRef = useRef(false);
  const videoSrcRef = useRef(videoSrc);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoSrcRef.current === videoSrc) {
      return;
    }

    videoSrcRef.current = videoSrc;
    pendingSeekSecondsRef.current = null;
    resumePlaybackAfterSeekRef.current = false;
  }, [videoSrc]);

  const { consumePlaybackPresentationMetrics } =
    useClipPreviewOverlayVideoFrames({
      durationSeconds,
      isPlaying,
      pendingSeekSecondsRef,
      setPlaying,
      trimOutSeconds: trim.outSeconds,
      updatePlaybackFrame,
      videoRef,
    });
  const { handleSeeked, handleSeeking, seekPreview } =
    useClipPreviewOverlaySeek({
      canUseClip,
      durationSeconds,
      pendingSeekSecondsRef,
      resumePlaybackAfterSeekRef,
      setPlaying,
      syncPlaybackPresentation,
      videoRef,
    });

  const handleEnterFullscreen = () => {
    const video = videoRef.current;
    if (!video || !canUseClip) {
      return;
    }

    void video
      .requestFullscreen()
      .then(() => {
        trackEvent("clip-preview-overlay-fullscreen-opened");
      })
      .catch((error: unknown) => {
        console.warn("[clip-preview] Could not enter fullscreen", { error });
      });
  };

  const handleTogglePlayback = () => {
    const video = videoRef.current;
    if (!video || !canUseClip) {
      return;
    }

    if (!video.paused) {
      resumePlaybackAfterSeekRef.current = false;
      video.pause();
      const pendingSeconds = pendingSeekSecondsRef.current;
      syncPlaybackPresentation(
        pendingSeconds ?? roundClipPreviewSeconds(video.currentTime),
      );
      setPlaying(false);
      return;
    }

    const pendingSeconds = pendingSeekSecondsRef.current;
    const shouldStartAtTrimStart =
      video.currentTime < trim.inSeconds ||
      video.currentTime >= trim.outSeconds;
    const nextStartSeconds =
      pendingSeconds ?? (shouldStartAtTrimStart ? trim.inSeconds : null);
    if (nextStartSeconds !== null) {
      pendingSeekSecondsRef.current = nextStartSeconds;
      seekVideo(video, nextStartSeconds);
      syncPlaybackPresentation(nextStartSeconds);
    }
    resumePlaybackAfterSeekRef.current = false;
    void video.play().catch((error: unknown) => {
      console.warn("[clip-preview] Could not play preview", { error });
      setPlaying(false);
    });
  };

  const handleToggleMuted = () => {
    const nextMuted = !isMuted;
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
    setMuted(nextMuted);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    const nextDurationSeconds = roundClipPreviewSeconds(video.duration);
    setDurationOverrideSeconds(nextDurationSeconds);
    if (!hasUserAdjustedTrimRef.current) {
      setTrim({ inSeconds: 0, outSeconds: nextDurationSeconds });
    }
  };

  const handleLoadStart = () => {
    setMediaError(null);
    setMediaReady(false);
  };

  const handleLoadedData = () => {
    setMediaReady(true);
  };

  const handleCanPlayThrough = () => {
    setMediaReady(true);
  };

  const handlePause = () => {
    setPlaying(false);
    const video = videoRef.current;
    if (video) {
      const pendingSeconds = pendingSeekSecondsRef.current;
      syncPlaybackPresentation(
        pendingSeconds ??
          roundClipPreviewSeconds(
            Math.min(
              Math.max(video.currentTime, trim.inSeconds),
              trim.outSeconds,
            ),
          ),
      );
    }
  };

  const handlePlay = () => {
    const video = videoRef.current;
    const pendingSeconds = pendingSeekSecondsRef.current;
    if (pendingSeconds !== null) {
      syncPlaybackPresentation(pendingSeconds);
    } else if (video && !video.seeking) {
      syncPlaybackPresentation(
        roundClipPreviewSeconds(
          Math.min(
            Math.max(video.currentTime, trim.inSeconds),
            trim.outSeconds,
          ),
        ),
      );
    }
    setPlaying(true);
  };

  const handleCanPlay = () => {
    setMediaReady(true);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const pendingSeconds = pendingSeekSecondsRef.current;
    if (pendingSeconds !== null) {
      syncPlaybackPresentation(pendingSeconds);
      return;
    }

    const clampedSeconds = roundClipPreviewSeconds(
      Math.min(Math.max(video.currentTime, trim.inSeconds), trim.outSeconds),
    );
    if (video.currentTime >= trim.outSeconds) {
      syncPlaybackPresentation(trim.outSeconds);
      video.pause();
      setPlaying(false);
      return;
    }
    if (video.paused || typeof video.requestVideoFrameCallback !== "function") {
      syncPlaybackPresentation(clampedSeconds);
    }
  };

  const handleVideoError = (event: SyntheticEvent<HTMLVideoElement>) => {
    pendingSeekSecondsRef.current = null;
    resumePlaybackAfterSeekRef.current = false;
    const mediaError = event.currentTarget.error;
    setMediaReady(false);
    setPlaying(false);
    setMediaError(
      mediaError?.message || "The replay preview could not be loaded.",
    );
    console.warn("[clip-preview] Replay video failed to load", {
      clipId,
      code: mediaError?.code ?? null,
      message: mediaError?.message ?? null,
      src: videoSrc,
    });
  };

  return {
    consumePlaybackPresentationMetrics,
    handleEnterFullscreen,
    handleCanPlay,
    handleCanPlayThrough,
    handleLoadedData,
    handleLoadedMetadata,
    handleLoadStart,
    handlePause,
    handlePlay,
    handleSeeked,
    handleSeeking,
    handleTimeUpdate,
    handleToggleMuted,
    handleTogglePlayback,
    handleVideoError,
    seekPreview,
    videoRef,
  };
}

export type { ClipPreviewPlaybackPresentationMetrics };
export { useClipPreviewOverlayPlayback };
