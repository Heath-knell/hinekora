import { useCallback, useEffect, useRef } from "react";

import type { VisualPlaybackSubscriber } from "~/renderer/modules/media-playback/useVisualPlaybackPublisher/useVisualPlaybackPublisher";

import { formatRecordingTimelineTimestamp } from "../RecordingBookmarkTimeline/RecordingBookmarkTimeline.utils";

interface RecordingPlaybackTimeProps {
  durationSeconds: number;
  playbackSeconds: number;
  subscribeVisualPlaybackTime?: VisualPlaybackSubscriber;
  visualPlaybackOffsetSeconds?: number;
}

function RecordingPlaybackTime({
  durationSeconds,
  playbackSeconds,
  subscribeVisualPlaybackTime,
  visualPlaybackOffsetSeconds = 0,
}: RecordingPlaybackTimeProps) {
  const playbackTimeRef = useRef<HTMLSpanElement>(null);

  const applyPlaybackSeconds = useCallback((seconds: number) => {
    if (playbackTimeRef.current) {
      playbackTimeRef.current.textContent =
        formatRecordingTimelineTimestamp(seconds);
    }
  }, []);

  const applyVisualPlaybackSeconds = useCallback(
    (seconds: number) => {
      applyPlaybackSeconds(seconds + visualPlaybackOffsetSeconds);
    },
    [applyPlaybackSeconds, visualPlaybackOffsetSeconds],
  );

  useEffect(() => {
    applyPlaybackSeconds(playbackSeconds);
    if (!subscribeVisualPlaybackTime) {
      return;
    }

    return subscribeVisualPlaybackTime(applyVisualPlaybackSeconds);
  }, [
    applyPlaybackSeconds,
    applyVisualPlaybackSeconds,
    playbackSeconds,
    subscribeVisualPlaybackTime,
  ]);

  return (
    <div className="min-w-32 text-sm tabular-nums">
      <span className="font-bold text-base-content" ref={playbackTimeRef}>
        {formatRecordingTimelineTimestamp(playbackSeconds)}
      </span>
      <span className="text-base-content/45">
        {" "}
        / {formatRecordingTimelineTimestamp(durationSeconds)}
      </span>
    </div>
  );
}

export { RecordingPlaybackTime };
