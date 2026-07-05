import { useEffect, useMemo } from "react";

import type { RecordingBookmark } from "~/main/modules/bookmarks";
import {
  allRecordingBookmarkCategoriesValue,
  type RecordingBookmarkCategoryFilter,
  recordingBookmarksPanelPageSize,
} from "~/renderer/modules/bookmarks/Bookmarks.components/RecordingBookmarksPanel/RecordingBookmarksPanel.utils";
import { useRewindsShallow } from "~/renderer/store";

interface UseRewindBookmarkPanelStateInput {
  bookmarks: RecordingBookmark[];
}

function useRewindBookmarkPanelState({
  bookmarks,
}: UseRewindBookmarkPanelStateInput) {
  const {
    bookmarkCategoryFilter,
    bookmarkPageIndex,
    selectBookmarkCategory,
    setBookmarkPageIndex,
  } = useRewindsShallow((rewinds) => ({
    bookmarkCategoryFilter: rewinds.detail.bookmarkCategoryFilter,
    bookmarkPageIndex: rewinds.detail.bookmarkPageIndex,
    selectBookmarkCategory: rewinds.selectDetailBookmarkCategory,
    setBookmarkPageIndex: rewinds.setDetailBookmarkPageIndex,
  }));

  const filteredPanelBookmarks = useMemo(() => {
    const filteredBookmarks =
      bookmarkCategoryFilter === allRecordingBookmarkCategoriesValue
        ? bookmarks
        : bookmarks.filter(
            (bookmark) => bookmark.category === bookmarkCategoryFilter,
          );

    return [...filteredBookmarks].sort(
      (left, right) => (right.offsetSeconds ?? 0) - (left.offsetSeconds ?? 0),
    );
  }, [bookmarkCategoryFilter, bookmarks]);

  const bookmarkPageCount = Math.max(
    1,
    Math.ceil(filteredPanelBookmarks.length / recordingBookmarksPanelPageSize),
  );
  const clampedBookmarkPageIndex = Math.min(
    bookmarkPageIndex,
    bookmarkPageCount - 1,
  );

  const bookmarkPanelItems = useMemo(() => {
    const startIndex =
      clampedBookmarkPageIndex * recordingBookmarksPanelPageSize;

    return filteredPanelBookmarks.slice(
      startIndex,
      startIndex + recordingBookmarksPanelPageSize,
    );
  }, [clampedBookmarkPageIndex, filteredPanelBookmarks]);

  useEffect(() => {
    if (bookmarkPageIndex !== clampedBookmarkPageIndex) {
      setBookmarkPageIndex(clampedBookmarkPageIndex);
    }
  }, [bookmarkPageIndex, clampedBookmarkPageIndex, setBookmarkPageIndex]);

  const handleBookmarkCategoryChange = (
    category: RecordingBookmarkCategoryFilter,
  ) => {
    selectBookmarkCategory(category);
  };

  const handlePreviousBookmarkPage = () => {
    setBookmarkPageIndex(clampedBookmarkPageIndex - 1);
  };

  const handleNextBookmarkPage = () => {
    setBookmarkPageIndex(
      Math.min(bookmarkPageCount - 1, clampedBookmarkPageIndex + 1),
    );
  };

  return {
    bookmarkCategoryFilter,
    bookmarkPageCount,
    bookmarkPageIndex: clampedBookmarkPageIndex,
    bookmarkPanelItems,
    bookmarkTotalCount: filteredPanelBookmarks.length,
    handleBookmarkCategoryChange,
    handleNextBookmarkPage,
    handlePreviousBookmarkPage,
  };
}

export { useRewindBookmarkPanelState };
