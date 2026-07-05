import { useEffect, useState } from "react";

import type {
  ActivitySessionClip,
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
import { useRewindsShallow } from "~/renderer/store";

import { useInitialRewindClipSelection } from "../useInitialRewindClipSelection/useInitialRewindClipSelection";
import { useRewindBookmarkPanelState } from "../useRewindBookmarkPanelState/useRewindBookmarkPanelState";
import { useRewindClipPreview } from "../useRewindClipPreview/useRewindClipPreview";
import { useRewindTimelineData } from "../useRewindTimelineData/useRewindTimelineData";
import { useRewindTimelineDerivedState } from "../useRewindTimelineDerivedState/useRewindTimelineDerivedState";

interface UseRewindDetailTimelineInput {
  initialPlaybackSeconds?: number | null;
  rewindId: string;
}

function useRewindDetailTimeline({
  initialPlaybackSeconds = null,
  rewindId,
}: UseRewindDetailTimelineInput) {
  const state = useRewindTimelineData(rewindId);
  const { resetDetail, timelineMarkerCategoryFilter } = useRewindsShallow(
    (rewinds) => ({
      resetDetail: rewinds.resetDetail,
      timelineMarkerCategoryFilter: rewinds.detail.timelineMarkerCategoryFilter,
    }),
  );
  const {
    clipPreviewState,
    mediaUrl,
    playback,
    selectClip,
    selectedClipId,
    subscribeVisualPlaybackTime,
  } = useRewindClipPreview();
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  useEffect(() => {
    if (!rewindId) {
      return;
    }

    resetDetail();
    setPlaybackSeconds(0);
    selectClip(null);
  }, [resetDetail, rewindId, selectClip]);

  const {
    bookmarkCategories,
    bookmarks,
    clipTargetsByBookmarkId,
    durationSeconds,
    markerBookmarks,
    selectedClipSegment,
    selectedClipTarget,
    visualPlaybackOffsetSeconds,
  } = useRewindTimelineDerivedState({
    selectedClipId,
    timeline: state.timeline,
    timelineMarkerCategoryFilter,
  });
  const {
    bookmarkCategoryFilter,
    bookmarkPageCount,
    bookmarkPageIndex,
    bookmarkPanelItems,
    bookmarkTotalCount,
    handleBookmarkCategoryChange,
    handleNextBookmarkPage,
    handlePreviousBookmarkPage,
  } = useRewindBookmarkPanelState({ bookmarks });
  const isTimelineTruncated =
    (state.timeline?.bookmarkTimelineItemsTruncated ?? false) ||
    (state.timeline?.clipTimelineItemsTruncated ?? false);

  useInitialRewindClipSelection({
    durationSeconds,
    initialPlaybackSeconds,
    rewindId,
    selectClip,
    setPlaybackSeconds,
    timeline: state.timeline,
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

  const selectRewindClip = (
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

  const seekRewindTimeline = (seconds: number, options: { play: boolean }) => {
    const nextSeconds = clampRecordingTimelineSeconds(seconds, durationSeconds);
    const clipTarget = state.timeline
      ? findRewindClipAtSeconds(state.timeline.clips, nextSeconds)
      : null;

    setPlaybackSeconds(nextSeconds);
    if (!clipTarget) {
      selectClip(null);
      return;
    }

    selectRewindClip(clipTarget, nextSeconds, options);
  };

  const handleSelectBookmark = (bookmark: RecordingBookmark) => {
    const timelineClips = state.timeline?.clips ?? [];
    const nextSeconds = resolveRewindBookmarkSeekSeconds({
      bookmark,
      clips: timelineClips,
    });
    const clipTarget =
      findRewindClipForBookmark(timelineClips, bookmark) ??
      findRewindClipAtSeconds(timelineClips, nextSeconds);

    setPlaybackSeconds(nextSeconds);
    if (clipTarget) {
      selectRewindClip(clipTarget, nextSeconds, { play: false });
      return;
    }

    selectClip(null);
  };

  const handleSeek = (seconds: number) => {
    seekRewindTimeline(seconds, { play: true });
  };

  const handleJumpToStart = () => {
    if (selectedClipTarget) {
      selectRewindClip(
        selectedClipTarget,
        selectedClipSegment?.startSeconds ?? 0,
        { play: false },
      );
      return;
    }

    seekRewindTimeline(0, { play: false });
  };

  const handleSeekBackward = () => {
    seekRewindTimeline(playbackSeconds - 5, { play: playback.isPlaying });
  };

  const handleSeekForward = () => {
    seekRewindTimeline(playbackSeconds + 5, { play: playback.isPlaying });
  };

  const handleClipTargetSelect = (clipId: string) => {
    const clipTarget =
      (state.timeline?.clips ?? []).find((clip) => clip.targetId === clipId) ??
      null;

    if (clipTarget) {
      selectRewindClip(
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
    bookmarkCategories,
    bookmarkCategoryFilter,
    bookmarkPageCount,
    bookmarkPageIndex,
    bookmarkPanelItems,
    bookmarkTotalCount,
    bookmarks,
    clipPreviewState,
    clipTargetsByBookmarkId,
    durationSeconds,
    handleBookmarkCategoryChange,
    handleClipTargetSelect,
    handleJumpToStart,
    handleNextBookmarkPage,
    handlePreviousBookmarkPage,
    handleSeek,
    handleSeekBackward,
    handleSeekForward,
    handleSelectBookmark,
    handleVolumeChange,
    isTimelineTruncated,
    mediaUrl,
    markerBookmarks,
    playback,
    playbackSeconds,
    selectedClipId,
    state,
    subscribeVisualPlaybackTime,
    visualPlaybackOffsetSeconds,
  };
}

export { useRewindDetailTimeline };
