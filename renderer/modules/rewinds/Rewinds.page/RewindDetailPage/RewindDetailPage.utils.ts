import {
  type ActivitySessionBookmark,
  type ActivitySessionTimeline,
  type BookmarkCategory,
  locationBookmarkCategories,
  type RecordingBookmark,
} from "~/main/modules/bookmarks/Bookmarks.dto";
import {
  allRecordingBookmarkCategoriesValue,
  type RecordingBookmarkCategoryFilter,
} from "~/renderer/modules/bookmarks/Bookmarks.components/RecordingBookmarksPanel/RecordingBookmarksPanel.utils";
import { defaultRewindTimelineMarkerFilterValue } from "~/renderer/modules/bookmarks/Bookmarks.utils";
import { resolveRewindClipSegment } from "~/renderer/modules/rewinds/Rewinds.utils/Rewinds.utils";

type RewindClipTargetsByBookmarkId = Record<
  string,
  {
    durationSeconds: number | null;
    targetDurationSeconds: number | null;
    targetId: string;
  }
>;
type RewindTimelineMarkerCategoryFilter =
  | RecordingBookmarkCategoryFilter
  | typeof defaultRewindTimelineMarkerFilterValue;

const rewindLocationCategories = new Set<BookmarkCategory>(
  locationBookmarkCategories,
);
const defaultRewindMarkerCategories = new Set<BookmarkCategory>([
  "death",
  "rewind-manual-replay",
]);

function calculateRewindDurationSeconds(
  timeline: ActivitySessionTimeline | null,
): number {
  if (!timeline) {
    return 0;
  }

  const startedAtMs = Date.parse(timeline.session.startedAt);
  const stoppedAtMs = timeline.session.stoppedAt
    ? Date.parse(timeline.session.stoppedAt)
    : Date.now();
  const sessionDurationSeconds =
    Number.isFinite(startedAtMs) && Number.isFinite(stoppedAtMs)
      ? Math.max(0, (stoppedAtMs - startedAtMs) / 1_000)
      : 0;
  const maxBookmarkOffset = Math.max(
    0,
    ...timeline.bookmarks.map((bookmark) => bookmark.offsetSeconds ?? 0),
    ...timeline.clips.map(
      (clip) =>
        resolveRewindClipSegment(clip)?.endSeconds ?? clip.offsetSeconds ?? 0,
    ),
  );

  return Math.max(sessionDurationSeconds, maxBookmarkOffset);
}

function mapRewindTimelineBookmarks(input: {
  bookmarks: ActivitySessionBookmark[];
  clipTargetsByBookmarkId: RewindClipTargetsByBookmarkId;
  durationSeconds: number;
}): RecordingBookmark[] {
  const visibleBookmarks = input.bookmarks.filter(
    (bookmark) => bookmark.category !== "manual",
  );
  const locationOffsets = visibleBookmarks
    .filter(isRewindLocationBookmark)
    .map((bookmark) => bookmark.offsetSeconds as number)
    .sort((firstOffset, secondOffset) => firstOffset - secondOffset);

  return visibleBookmarks.map((bookmark) => {
    const clipTarget = input.clipTargetsByBookmarkId[bookmark.id];
    if (clipTarget) {
      return {
        ...bookmark,
        durationSeconds:
          clipTarget.durationSeconds ?? clipTarget.targetDurationSeconds,
      };
    }

    return {
      ...bookmark,
      durationSeconds: resolveRewindLocationDurationSeconds({
        durationSeconds: input.durationSeconds,
        locationOffsets,
        offsetSeconds: bookmark.offsetSeconds,
        category: bookmark.category,
      }),
    };
  });
}

function filterRewindTimelineMarkerBookmarks(input: {
  bookmarks: RecordingBookmark[];
  categoryFilter: RewindTimelineMarkerCategoryFilter;
}): RecordingBookmark[] {
  if (input.categoryFilter === defaultRewindTimelineMarkerFilterValue) {
    return input.bookmarks.filter((bookmark) =>
      defaultRewindMarkerCategories.has(bookmark.category),
    );
  }

  if (input.categoryFilter === allRecordingBookmarkCategoriesValue) {
    return input.bookmarks;
  }

  return input.bookmarks.filter(
    (bookmark) => bookmark.category === input.categoryFilter,
  );
}

function resolveRewindLocationDurationSeconds(input: {
  category: BookmarkCategory;
  durationSeconds: number;
  locationOffsets: number[];
  offsetSeconds: number | null;
}): number | null {
  if (
    !rewindLocationCategories.has(input.category) ||
    typeof input.offsetSeconds !== "number" ||
    !Number.isFinite(input.offsetSeconds)
  ) {
    return null;
  }

  const offsetSeconds = input.offsetSeconds;
  const nextOffset = input.locationOffsets.find(
    (offset) => offset > offsetSeconds,
  );
  const segmentEndSeconds = nextOffset ?? input.durationSeconds;

  return Math.max(0, segmentEndSeconds - offsetSeconds);
}

function isRewindLocationBookmark(bookmark: ActivitySessionBookmark): boolean {
  return (
    rewindLocationCategories.has(bookmark.category) &&
    typeof bookmark.offsetSeconds === "number" &&
    Number.isFinite(bookmark.offsetSeconds)
  );
}

export {
  calculateRewindDurationSeconds,
  defaultRewindTimelineMarkerFilterValue,
  filterRewindTimelineMarkerBookmarks,
  mapRewindTimelineBookmarks,
  type RewindTimelineMarkerCategoryFilter,
};
