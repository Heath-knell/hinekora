import type { RecordingBookmark } from "~/main/modules/bookmarks";
import { RecordingBookmarkTimelineMarker } from "~/renderer/modules/bookmarks/Bookmarks.components/RecordingBookmarkTimelineMarker/RecordingBookmarkTimelineMarker";
import { RecordingTimelineHoverSegment } from "~/renderer/modules/bookmarks/Bookmarks.components/RecordingTimelineHoverSegment/RecordingTimelineHoverSegment";

interface EditorTimelineBookmarkMarkersProps {
  hoveredBookmark: RecordingBookmark | null;
  markerBookmarks: RecordingBookmark[];
  pinnedBookmark: RecordingBookmark | null;
  showBookmarkMarkers: boolean;
  visibleDurationSeconds: number;
}

function EditorTimelineBookmarkMarkers({
  hoveredBookmark,
  markerBookmarks,
  pinnedBookmark,
  showBookmarkMarkers,
  visibleDurationSeconds,
}: EditorTimelineBookmarkMarkersProps) {
  const shouldRenderPinnedBookmark =
    pinnedBookmark !== null &&
    (!showBookmarkMarkers ||
      !markerBookmarks.some((bookmark) => bookmark.id === pinnedBookmark.id));

  return (
    <>
      <RecordingTimelineHoverSegment
        durationSeconds={visibleDurationSeconds}
        hoveredBookmark={hoveredBookmark}
      />
      {pinnedBookmark && shouldRenderPinnedBookmark && (
        <RecordingBookmarkTimelineMarker
          bookmark={pinnedBookmark}
          durationSeconds={visibleDurationSeconds}
        />
      )}
      {showBookmarkMarkers &&
        markerBookmarks.map((bookmark) => (
          <RecordingBookmarkTimelineMarker
            bookmark={bookmark}
            durationSeconds={visibleDurationSeconds}
            key={bookmark.id}
          />
        ))}
    </>
  );
}

export type { EditorTimelineBookmarkMarkersProps };
export { EditorTimelineBookmarkMarkers };
