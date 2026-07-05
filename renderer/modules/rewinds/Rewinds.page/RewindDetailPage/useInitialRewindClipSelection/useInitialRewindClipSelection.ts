import { useEffect, useRef } from "react";

import type { ActivitySessionTimeline } from "~/main/modules/bookmarks";
import { clampRecordingTimelineSeconds } from "~/renderer/modules/bookmarks/Bookmarks.components/RecordingBookmarkTimeline/RecordingBookmarkTimeline.utils";
import {
  findRewindClipAtSeconds,
  resolveRewindClipLocalSeconds,
  resolveRewindClipSegment,
} from "~/renderer/modules/rewinds/Rewinds.utils/Rewinds.utils";

interface UseInitialRewindClipSelectionInput {
  durationSeconds: number;
  initialPlaybackSeconds: number | null;
  rewindId: string;
  selectClip: (
    clipId: string | null,
    options?: { play?: boolean; seekSeconds?: number },
  ) => void;
  setPlaybackSeconds: (seconds: number) => void;
  timeline: ActivitySessionTimeline | null;
}

function useInitialRewindClipSelection({
  durationSeconds,
  initialPlaybackSeconds,
  rewindId,
  selectClip,
  setPlaybackSeconds,
  timeline,
}: UseInitialRewindClipSelectionInput) {
  const initialClipAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!timeline) {
      return;
    }

    const initialKey = `${rewindId}:${initialPlaybackSeconds ?? "first-clip"}`;
    if (initialClipAppliedRef.current === initialKey) {
      return;
    }

    initialClipAppliedRef.current = initialKey;
    const firstClip = timeline.clips[0] ?? null;
    const initialSeconds =
      initialPlaybackSeconds !== null
        ? clampRecordingTimelineSeconds(initialPlaybackSeconds, durationSeconds)
        : (resolveRewindClipSegment(firstClip)?.startSeconds ?? 0);
    const clipTarget =
      initialPlaybackSeconds !== null
        ? findRewindClipAtSeconds(timeline.clips, initialSeconds)
        : firstClip;

    setPlaybackSeconds(initialSeconds);
    if (!clipTarget) {
      selectClip(null);
      return;
    }

    selectClip(clipTarget.targetId, {
      play: false,
      seekSeconds: resolveRewindClipLocalSeconds(clipTarget, initialSeconds),
    });
  }, [
    durationSeconds,
    initialPlaybackSeconds,
    rewindId,
    selectClip,
    setPlaybackSeconds,
    timeline,
  ]);
}

export { useInitialRewindClipSelection };
