import type {
  ActivitySessionClip,
  RecordingBookmark,
} from "~/main/modules/bookmarks/Bookmarks.dto";
import { resolveMediaClipTargetSegment } from "~/renderer/modules/media-playback/MediaTimeline.utils/MediaTimeline.utils";

interface RewindClipSegment {
  endSeconds: number;
  startSeconds: number;
}

function findRewindClipAtSeconds(
  clips: ActivitySessionClip[],
  seconds: number,
): ActivitySessionClip | null {
  return (
    clips.find((clip) => {
      const segment = resolveRewindClipSegment(clip);

      return (
        segment !== null &&
        seconds >= segment.startSeconds &&
        seconds <= segment.endSeconds
      );
    }) ?? null
  );
}

function findRewindClipForBookmark(
  clips: ActivitySessionClip[],
  bookmark: Pick<RecordingBookmark, "id">,
): ActivitySessionClip | null {
  return clips.find((clip) => clip.bookmarkId === bookmark.id) ?? null;
}

function resolveRewindClipLocalSeconds(
  clip: ActivitySessionClip,
  seconds: number,
): number {
  const segment = resolveRewindClipSegment(clip);
  if (!segment) {
    return 0;
  }

  const visibleDurationSeconds = segment.endSeconds - segment.startSeconds;
  const hiddenLeadingSeconds = Math.max(
    0,
    resolveRewindClipDurationSeconds(clip) - visibleDurationSeconds,
  );

  return Math.min(
    Math.max(hiddenLeadingSeconds + seconds - segment.startSeconds, 0),
    hiddenLeadingSeconds + visibleDurationSeconds,
  );
}

function resolveRewindClipSegment(
  clip: ActivitySessionClip | null,
): RewindClipSegment | null {
  if (!clip) {
    return null;
  }

  const segment = resolveMediaClipTargetSegment({
    durationSeconds: clip.durationSeconds,
    offsetSeconds: clip.offsetSeconds,
    targetDurationSeconds: clip.targetDurationSeconds,
    unknownDurationMode: "trigger-only",
  });
  if (!segment) {
    return null;
  }

  return { endSeconds: segment.endSeconds, startSeconds: segment.startSeconds };
}

function resolveRewindClipDurationSeconds(
  clip: Pick<
    ActivitySessionClip,
    "durationSeconds" | "offsetSeconds" | "targetDurationSeconds"
  >,
): number {
  if (
    typeof clip.durationSeconds === "number" &&
    Number.isFinite(clip.durationSeconds) &&
    clip.durationSeconds > 0
  ) {
    return clip.durationSeconds;
  }

  if (
    typeof clip.targetDurationSeconds !== "number" ||
    !Number.isFinite(clip.targetDurationSeconds) ||
    clip.targetDurationSeconds <= 0
  ) {
    return 0;
  }

  if (
    typeof clip.offsetSeconds !== "number" ||
    !Number.isFinite(clip.offsetSeconds)
  ) {
    return 0;
  }

  return Math.min(clip.targetDurationSeconds, Math.max(0, clip.offsetSeconds));
}

function resolveRewindClipVisualOffsetSeconds(
  clip: ActivitySessionClip | null,
): number {
  const segment = resolveRewindClipSegment(clip);
  if (!clip || !segment) {
    return 0;
  }

  return (
    segment.startSeconds -
    resolveRewindClipLocalSeconds(clip, segment.startSeconds)
  );
}

function resolveRewindBookmarkSeekSeconds(input: {
  bookmark: Pick<RecordingBookmark, "id" | "offsetSeconds">;
  clips: ActivitySessionClip[];
}): number {
  const linkedClipSegment = resolveRewindClipSegment(
    findRewindClipForBookmark(input.clips, input.bookmark),
  );

  if (linkedClipSegment) {
    return linkedClipSegment.startSeconds;
  }

  return input.bookmark.offsetSeconds ?? 0;
}

export {
  findRewindClipAtSeconds,
  findRewindClipForBookmark,
  resolveRewindBookmarkSeekSeconds,
  resolveRewindClipLocalSeconds,
  resolveRewindClipSegment,
  resolveRewindClipVisualOffsetSeconds,
};
