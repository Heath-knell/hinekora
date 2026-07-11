import { useEffect, useState } from "react";

import type {
  ActivitySessionClip,
  ActivitySessionTimeline,
  RecordingBookmark,
} from "~/main/modules/bookmarks";
import { clampRecordingTimelineSeconds } from "~/renderer/modules/bookmarks/Bookmarks.components/RecordingBookmarkTimeline/RecordingBookmarkTimeline.utils";
import {
  findRewindClipAtSeconds,
  findRewindClipForBookmark,
  resolveRewindBookmarkSeekSeconds,
  resolveRewindClipLocalSeconds,
  resolveRewindClipSegment,
} from "~/renderer/modules/rewinds/Rewinds.utils/Rewinds.utils";

import { useInitialRewindClipSelection } from "../useInitialRewindClipSelection/useInitialRewindClipSelection";

interface RewindMediaPlayback {
  getPlaybackSeconds: () => number;
  isPlaying: boolean;
  playbackSeconds: number;
  setVolume: (volume: number) => void;
}
type SelectRewindClip = (
  clipId: string | null,
  options?: { play?: boolean; seekSeconds?: number },
) => void;

interface UseRewindTimelinePlaybackInput {
  durationSeconds: number;
  initialPlaybackSeconds: number | null;
  mediaUrl: string | null;
  playback: RewindMediaPlayback;
  rewindId: string;
  selectClip: SelectRewindClip;
  selectedClipSegment: ReturnType<typeof resolveRewindClipSegment>;
  selectedClipTarget: ActivitySessionClip | null;
  timeline: ActivitySessionTimeline | null;
  visualPlaybackOffsetSeconds: number;
}

function useRewindTimelinePlayback({
  durationSeconds,
  initialPlaybackSeconds,
  mediaUrl,
  playback,
  rewindId,
  selectClip,
  selectedClipSegment,
  selectedClipTarget,
  timeline,
  visualPlaybackOffsetSeconds,
}: UseRewindTimelinePlaybackInput) {
  const [playbackSeconds, setPlaybackSeconds] = useState(0);

  useEffect(() => {
    if (!rewindId) {
      return;
    }

    setPlaybackSeconds(0);
    selectClip(null);
  }, [rewindId, selectClip]);

  useInitialRewindClipSelection({
    durationSeconds,
    initialPlaybackSeconds,
    rewindId,
    selectClip,
    setPlaybackSeconds,
    timeline,
  });

  useEffect(() => {
    if (!selectedClipSegment || !mediaUrl) {
      return;
    }

    setPlaybackSeconds(
      clampRecordingTimelineSeconds(
        visualPlaybackOffsetSeconds + playback.playbackSeconds,
        durationSeconds,
      ),
    );
  }, [
    durationSeconds,
    mediaUrl,
    playback.playbackSeconds,
    selectedClipSegment,
    visualPlaybackOffsetSeconds,
  ]);

  const selectTimelineClip = (
    clipTarget: ActivitySessionClip,
    timelineSeconds: number,
    options: { play: boolean },
  ) => {
    const clipLocalSeconds = resolveRewindClipLocalSeconds(
      clipTarget,
      timelineSeconds,
    );

    setPlaybackSeconds(timelineSeconds);
    selectClip(clipTarget.targetId, {
      play: options.play,
      seekSeconds: clipLocalSeconds,
    });
  };

  const seekTimeline = (seconds: number, options: { play: boolean }) => {
    const nextSeconds = clampRecordingTimelineSeconds(seconds, durationSeconds);
    const clipTarget = timeline
      ? findRewindClipAtSeconds(timeline.clips, nextSeconds)
      : null;

    setPlaybackSeconds(nextSeconds);
    if (!clipTarget) {
      selectClip(null);
      return;
    }

    selectTimelineClip(clipTarget, nextSeconds, options);
  };

  const handleSelectBookmark = (bookmark: RecordingBookmark) => {
    const timelineClips = timeline?.clips ?? [];
    const nextSeconds = resolveRewindBookmarkSeekSeconds({
      bookmark,
      clips: timelineClips,
    });
    const clipTarget =
      findRewindClipForBookmark(timelineClips, bookmark) ??
      findRewindClipAtSeconds(timelineClips, nextSeconds);

    setPlaybackSeconds(nextSeconds);
    if (clipTarget) {
      selectTimelineClip(clipTarget, nextSeconds, { play: false });
      return;
    }

    selectClip(null);
  };

  const handleSeek = (seconds: number) => {
    seekTimeline(seconds, { play: true });
  };

  const handleJumpToStart = () => {
    if (selectedClipTarget) {
      selectTimelineClip(
        selectedClipTarget,
        selectedClipSegment?.startSeconds ?? 0,
        { play: false },
      );
      return;
    }

    seekTimeline(0, { play: false });
  };

  const getTimelinePlaybackSeconds = () => {
    if (!selectedClipSegment || !mediaUrl) {
      return playbackSeconds;
    }

    return clampRecordingTimelineSeconds(
      visualPlaybackOffsetSeconds + playback.getPlaybackSeconds(),
      durationSeconds,
    );
  };

  const handleSeekBackward = () => {
    seekTimeline(getTimelinePlaybackSeconds() - 5, {
      play: playback.isPlaying,
    });
  };

  const handleSeekForward = () => {
    seekTimeline(getTimelinePlaybackSeconds() + 5, {
      play: playback.isPlaying,
    });
  };

  const handleClipTargetSelect = (clipId: string) => {
    const clipTarget =
      (timeline?.clips ?? []).find((clip) => clip.targetId === clipId) ?? null;

    if (clipTarget) {
      selectTimelineClip(
        clipTarget,
        resolveRewindClipSegment(clipTarget)?.startSeconds ?? 0,
        { play: false },
      );
      return;
    }

    selectClip(clipId);
  };

  const handleVolumeChange = (volume: number) => {
    playback.setVolume(volume);
  };

  return {
    handleClipTargetSelect,
    handleJumpToStart,
    handleSeek,
    handleSeekBackward,
    handleSeekForward,
    handleSelectBookmark,
    handleVolumeChange,
    playbackSeconds,
  };
}

export { useRewindTimelinePlayback };
