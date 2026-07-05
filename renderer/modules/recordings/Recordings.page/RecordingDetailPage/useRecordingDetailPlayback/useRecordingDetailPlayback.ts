import { useEffect, useRef } from "react";

import { useMediaPlayback } from "~/renderer/modules/media-playback/useMediaPlayback/useMediaPlayback";
import { useVisualPlaybackPublisher } from "~/renderer/modules/media-playback/useVisualPlaybackPublisher/useVisualPlaybackPublisher";

interface UseRecordingDetailPlaybackInput {
  detailReady: boolean;
  fallbackDurationSeconds: number | null;
  initialPlaybackSeconds: number | null;
  mediaUrl: string | null;
  recordingId: string;
}

function useRecordingDetailPlayback({
  detailReady,
  fallbackDurationSeconds,
  initialPlaybackSeconds,
  mediaUrl,
  recordingId,
}: UseRecordingDetailPlaybackInput) {
  const appliedInitialPlaybackKeyRef = useRef<string | null>(null);
  const { publishVisualPlaybackTime, subscribeVisualPlaybackTime } =
    useVisualPlaybackPublisher();
  const playback = useMediaPlayback({
    fallbackDurationSeconds,
    mediaUrl,
    onVisualTimeChange: publishVisualPlaybackTime,
  });

  useEffect(() => {
    if (!detailReady || initialPlaybackSeconds === null) {
      return;
    }
    if (initialPlaybackSeconds > 0 && playback.durationSeconds <= 0) {
      return;
    }

    const seekKey = `${recordingId}:${initialPlaybackSeconds}`;
    if (appliedInitialPlaybackKeyRef.current === seekKey) {
      return;
    }

    appliedInitialPlaybackKeyRef.current = seekKey;
    playback.seekTo(initialPlaybackSeconds);
  }, [
    detailReady,
    initialPlaybackSeconds,
    playback.durationSeconds,
    playback.seekTo,
    recordingId,
  ]);

  return {
    ...playback,
    subscribeVisualPlaybackTime,
  };
}

export { useRecordingDetailPlayback };
