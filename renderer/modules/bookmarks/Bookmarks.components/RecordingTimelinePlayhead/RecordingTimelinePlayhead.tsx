import { useCallback, useEffect, useRef } from "react";

import type { VisualPlaybackSubscriber } from "~/renderer/modules/media-playback/useVisualPlaybackPublisher/useVisualPlaybackPublisher";

import {
  calculateRecordingTimelinePercent,
  recordingTimelineRailPaddingPixels,
} from "../RecordingBookmarkTimeline/RecordingBookmarkTimeline.utils";

interface RecordingTimelinePlayheadProps {
  durationSeconds: number;
  playbackSeconds: number;
  railWidthPixels: number;
  subscribeVisualPlaybackTime?: VisualPlaybackSubscriber;
  visualPlaybackOffsetSeconds?: number;
}

function RecordingTimelinePlayhead({
  durationSeconds,
  playbackSeconds,
  railWidthPixels,
  subscribeVisualPlaybackTime,
  visualPlaybackOffsetSeconds = 0,
}: RecordingTimelinePlayheadProps) {
  const displayedSecondsRef = useRef(playbackSeconds);
  const playbackSecondsPropRef = useRef(playbackSeconds);
  const subscriberPropRef = useRef(subscribeVisualPlaybackTime);
  const playheadRef = useRef<HTMLDivElement>(null);
  const formatPlayheadTransform = useCallback(
    (seconds: number) => {
      const playheadPercent = calculateRecordingTimelinePercent(
        seconds,
        durationSeconds,
      );

      return `translate3d(${(railWidthPixels * playheadPercent) / 100}px, 0, 0) translateX(-50%)`;
    },
    [durationSeconds, railWidthPixels],
  );

  const applyTimelineSeconds = useCallback(
    (seconds: number) => {
      displayedSecondsRef.current = seconds;
      if (playheadRef.current) {
        playheadRef.current.style.transform = formatPlayheadTransform(seconds);
      }
    },
    [formatPlayheadTransform],
  );

  useEffect(() => {
    const subscriberChanged =
      subscriberPropRef.current !== subscribeVisualPlaybackTime;
    const nextSeconds =
      playbackSecondsPropRef.current === playbackSeconds && !subscriberChanged
        ? displayedSecondsRef.current
        : playbackSeconds;
    playbackSecondsPropRef.current = playbackSeconds;
    subscriberPropRef.current = subscribeVisualPlaybackTime;
    applyTimelineSeconds(nextSeconds);
  }, [applyTimelineSeconds, playbackSeconds, subscribeVisualPlaybackTime]);

  const applyVisualPlaybackSeconds = useCallback(
    (seconds: number) => {
      applyTimelineSeconds(seconds + visualPlaybackOffsetSeconds);
    },
    [applyTimelineSeconds, visualPlaybackOffsetSeconds],
  );

  useEffect(() => {
    if (!subscribeVisualPlaybackTime) {
      return;
    }

    return subscribeVisualPlaybackTime(applyVisualPlaybackSeconds);
  }, [applyVisualPlaybackSeconds, subscribeVisualPlaybackTime]);

  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-40 w-8 will-change-transform"
      data-recording-timeline-playhead="true"
      ref={playheadRef}
      style={{
        left: `${recordingTimelineRailPaddingPixels}px`,
        transform: formatPlayheadTransform(playbackSeconds),
      }}
    >
      <span className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-base-content shadow" />
      <span className="absolute top-0 left-1/2 h-5 w-4 -translate-x-1/2 rounded-full bg-base-content shadow ring-2 ring-base-300" />
    </div>
  );
}

export { RecordingTimelinePlayhead };
