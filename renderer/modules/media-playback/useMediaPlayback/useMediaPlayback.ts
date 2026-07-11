import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type PendingMediaPlaybackSeek,
  useMediaPlaybackVideoFrames,
} from "../useMediaPlaybackVideoFrames/useMediaPlaybackVideoFrames";

interface UseMediaPlaybackInput {
  fallbackDurationSeconds: number | null;
  mediaUrl: string | null;
  onVisualTimeChange?: (seconds: number) => void;
}

function clampMediaPlaybackSeconds(seconds: number, durationSeconds: number) {
  if (!Number.isFinite(seconds)) {
    return 0;
  }

  return Math.min(Math.max(seconds, 0), Math.max(durationSeconds, 0));
}

function useMediaPlayback({
  fallbackDurationSeconds,
  mediaUrl,
  onVisualTimeChange,
}: UseMediaPlaybackInput) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSeekRef = useRef<PendingMediaPlaybackSeek | null>(null);
  const playbackSecondsRef = useRef(0);
  const [actualDurationSeconds, setActualDurationSeconds] = useState<
    number | null
  >(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [volume, setVolume] = useState(1);

  const durationSeconds = useMemo(() => {
    if (
      typeof actualDurationSeconds === "number" &&
      Number.isFinite(actualDurationSeconds) &&
      actualDurationSeconds > 0
    ) {
      return actualDurationSeconds;
    }

    return typeof fallbackDurationSeconds === "number" &&
      Number.isFinite(fallbackDurationSeconds) &&
      fallbackDurationSeconds > 0
      ? fallbackDurationSeconds
      : 0;
  }, [actualDurationSeconds, fallbackDurationSeconds]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }

    setActualDurationSeconds(mediaUrl ? null : 0);
    setIsPlaying(false);
    pendingSeekRef.current = null;
    playbackSecondsRef.current = 0;
    onVisualTimeChange?.(0);
    setPlaybackSeconds(0);
  }, [mediaUrl, onVisualTimeChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaUrl) {
      return;
    }

    video.volume = volume;
    video.muted = volume <= 0;
  }, [mediaUrl, volume]);

  const publishPlaybackSeconds = useCallback(
    (nextSeconds: number, options: { force?: boolean } = {}) => {
      const clampedSeconds = clampMediaPlaybackSeconds(
        nextSeconds,
        durationSeconds,
      );

      playbackSecondsRef.current = clampedSeconds;
      onVisualTimeChange?.(clampedSeconds);
      if (options.force) {
        setPlaybackSeconds(clampedSeconds);
      }
    },
    [durationSeconds, onVisualTimeChange],
  );

  const syncPlaybackPosition = useCallback(
    (options: { force?: boolean } = {}) => {
      const video = videoRef.current;
      if (!video) {
        return;
      }

      const pendingSeek = pendingSeekRef.current;
      if (pendingSeek !== null && video.seeking) {
        publishPlaybackSeconds(pendingSeek.seconds, options);
        return;
      }

      const currentTime = video.currentTime;
      if (typeof currentTime === "number" && Number.isFinite(currentTime)) {
        pendingSeekRef.current = null;
        publishPlaybackSeconds(currentTime, options);
      }
    },
    [publishPlaybackSeconds],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const nextSeconds = clampMediaPlaybackSeconds(seconds, durationSeconds);
      const video = videoRef.current;
      if (video) {
        pendingSeekRef.current = {
          seconds: nextSeconds,
          settledFrameMisses: 0,
        };
        video.currentTime = nextSeconds;
      }

      publishPlaybackSeconds(nextSeconds, { force: true });
    },
    [durationSeconds, publishPlaybackSeconds],
  );

  const seekBy = useCallback(
    (seconds: number) => {
      seekTo(playbackSecondsRef.current + seconds);
    },
    [seekTo],
  );

  const jumpToStart = useCallback(() => {
    seekTo(0);
  }, [seekTo]);

  const getPlaybackSeconds = useCallback(() => playbackSecondsRef.current, []);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video || !mediaUrl) {
      return;
    }

    void video.play().catch(() => {
      setIsPlaying(false);
    });
  }, [mediaUrl]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || !mediaUrl) {
      return;
    }

    if (video.paused) {
      play();
      return;
    }

    video.pause();
  }, [mediaUrl, play]);

  const handleLoadedMetadata = useCallback(() => {
    const loadedDuration = videoRef.current?.duration;
    setActualDurationSeconds(
      typeof loadedDuration === "number" &&
        Number.isFinite(loadedDuration) &&
        loadedDuration > 0
        ? loadedDuration
        : null,
    );
  }, []);

  useMediaPlaybackVideoFrames({
    isPlaying,
    mediaUrl,
    pendingSeekRef,
    publishPlaybackSeconds,
    syncPlaybackPosition,
    videoRef,
  });

  const handleTimeUpdate = useCallback(() => {
    if (!isPlaying) {
      syncPlaybackPosition({ force: true });
    }
  }, [isPlaying, syncPlaybackPosition]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    syncPlaybackPosition({ force: true });
  }, [syncPlaybackPosition]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    seekTo(durationSeconds);
  }, [durationSeconds, seekTo]);

  return {
    durationSeconds,
    getPlaybackSeconds,
    handleEnded,
    handleLoadedMetadata,
    handlePause,
    handlePlay,
    handleTimeUpdate,
    isPlaying,
    jumpToStart,
    play,
    playbackSeconds,
    seekBy,
    seekTo,
    setVolume,
    togglePlayback,
    videoRef,
    volume,
  };
}

export { clampMediaPlaybackSeconds, useMediaPlayback };
