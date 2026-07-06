import type { RecordingBookmark } from "~/main/modules/bookmarks";
import { RecordingBookmarksPanel } from "~/renderer/modules/bookmarks/Bookmarks.components/RecordingBookmarksPanel/RecordingBookmarksPanel";

import type { EditorRecordingBookmarks } from "../../Editor.page/EditorPage/useEditorRecordingBookmarks/useEditorRecordingBookmarks";

interface EditorBookmarksRailProps {
  bookmarks: EditorRecordingBookmarks;
  onClose: () => void;
  onHoverBookmark: (bookmark: RecordingBookmark | null) => void;
  onSelectBookmark: (bookmark: RecordingBookmark) => void;
}

function EditorBookmarksRail({
  bookmarks,
  onClose,
  onHoverBookmark,
  onSelectBookmark,
}: EditorBookmarksRailProps) {
  return (
    <RecordingBookmarksPanel
      activeCategoryFilter={
        bookmarks.showBookmarkMarkers ? bookmarks.categoryFilter : null
      }
      bookmarks={bookmarks.latestBookmarks}
      categories={bookmarks.categories}
      categoryFilter={bookmarks.categoryFilter}
      emptyMessage={
        bookmarks.recordingSource
          ? "No bookmarks overlap the selected clip."
          : "Select a recording clip to show its bookmarks."
      }
      errorMessage={bookmarks.error}
      heightPixels={null}
      isLoading={bookmarks.isLoading}
      isTimelineTruncated={bookmarks.timelineItemsTruncated}
      pageCount={bookmarks.pageCount}
      pageIndex={bookmarks.pageIndex}
      selectedBookmarkId={bookmarks.selectedBookmarkId}
      subtitle={bookmarks.recordingSource?.name ?? "Recording markers"}
      totalCount={bookmarks.totalCount}
      onCategoryChange={bookmarks.selectCategory}
      onClose={onClose}
      onHoverBookmark={onHoverBookmark}
      onNextPage={bookmarks.nextPage}
      onPreviousPage={bookmarks.previousPage}
      onSelectBookmark={onSelectBookmark}
    />
  );
}

export { EditorBookmarksRail };
