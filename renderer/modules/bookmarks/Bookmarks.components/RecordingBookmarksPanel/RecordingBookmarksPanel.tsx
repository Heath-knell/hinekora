import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

import type {
  BookmarkCategory,
  RecordingBookmark,
} from "~/main/modules/bookmarks";
import { BookmarksCategoryFilterChip } from "~/renderer/modules/bookmarks/Bookmarks.components/BookmarksCategoryFilterChip/BookmarksCategoryFilterChip";

import { RecordingBookmarksPanelItem } from "../RecordingBookmarksPanelItem/RecordingBookmarksPanelItem";
import {
  allRecordingBookmarkCategoriesValue,
  type RecordingBookmarkCategoryFilter,
} from "./RecordingBookmarksPanel.utils";

interface RecordingBookmarksPanelProps {
  activeCategoryFilter?: RecordingBookmarkCategoryFilter | null;
  bookmarks: RecordingBookmark[];
  categories: BookmarkCategory[];
  categoryFilter: RecordingBookmarkCategoryFilter;
  emptyMessage?: string;
  errorMessage?: string | null;
  heightPixels: number | null;
  isTimelineTruncated?: boolean;
  isLoading?: boolean;
  pageCount: number;
  pageIndex: number;
  selectedBookmarkId?: string | null;
  subtitle?: string;
  title?: string;
  totalCount: number;
  onClose?: () => void;
  onCategoryChange: (category: RecordingBookmarkCategoryFilter) => void;
  onHoverBookmark?: (bookmark: RecordingBookmark | null) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onSelectBookmark: (bookmark: RecordingBookmark) => void;
}

function RecordingBookmarksPanel({
  bookmarks,
  categories,
  categoryFilter,
  activeCategoryFilter = categoryFilter,
  emptyMessage = "No bookmarks are attached yet.",
  errorMessage = null,
  heightPixels,
  isTimelineTruncated = false,
  isLoading = false,
  pageCount,
  pageIndex,
  selectedBookmarkId = null,
  subtitle = "Latest markers",
  title = "Bookmarks",
  totalCount,
  onClose,
  onCategoryChange,
  onHoverBookmark,
  onNextPage,
  onPreviousPage,
  onSelectBookmark,
}: RecordingBookmarksPanelProps) {
  const filterCategories: RecordingBookmarkCategoryFilter[] = [
    allRecordingBookmarkCategoriesValue,
    ...categories,
  ];
  const panelStyle =
    heightPixels && Number.isFinite(heightPixels)
      ? { height: `${heightPixels}px` }
      : undefined;

  return (
    <aside
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-base-content/10 bg-base-200"
      style={panelStyle}
    >
      <div className="flex items-center gap-2 border-base-content/10 border-b p-3">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 font-bold text-sm">{title}</h2>
          <p className="m-0 text-base-content/55 text-xs">{subtitle}</p>
        </div>
        {onClose && (
          <div
            className="tooltip tooltip-left no-drag"
            data-tip="Close bookmarks panel"
          >
            <button
              aria-label="Close bookmarks panel"
              className="btn btn-ghost btn-xs"
              type="button"
              onClick={onClose}
            >
              <FiX size={15} />
            </button>
          </div>
        )}
      </div>
      <div className="border-base-content/10 border-b p-3">
        <div className="flex flex-wrap gap-1.5">
          {filterCategories.map((category) => (
            <BookmarksCategoryFilterChip
              category={category}
              isActive={activeCategoryFilter === category}
              key={category}
              onSelect={onCategoryChange}
            />
          ))}
        </div>
      </div>
      {isTimelineTruncated && (
        <p className="m-0 border-base-content/10 border-b px-3 py-2 text-warning text-xs">
          Timeline markers were capped for performance. Use the Bookmarks page
          for the complete list.
        </p>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">
        {isLoading && (
          <div className="grid flex-1 place-items-center text-base-content/55 text-sm">
            <span className="loading loading-spinner loading-sm" />
          </div>
        )}
        {!isLoading && errorMessage && (
          <p className="m-0 rounded-md border border-error/30 bg-error/10 p-3 text-error text-sm">
            {errorMessage}
          </p>
        )}
        {!isLoading &&
          !errorMessage &&
          bookmarks.map((bookmark) => (
            <RecordingBookmarksPanelItem
              bookmark={bookmark}
              isSelected={bookmark.id === selectedBookmarkId}
              key={bookmark.id}
              {...(onHoverBookmark ? { onHover: onHoverBookmark } : {})}
              onSelect={onSelectBookmark}
            />
          ))}
        {!isLoading && !errorMessage && bookmarks.length === 0 && (
          <p className="m-0 text-base-content/55 text-sm">{emptyMessage}</p>
        )}
      </div>
      <div className="flex h-9 shrink-0 items-center justify-between border-base-content/10 border-t px-3 text-xs">
        <span className="text-base-content/60">{totalCount} items</span>
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous bookmark page"
            className="btn btn-ghost btn-xs btn-square"
            disabled={pageIndex === 0}
            type="button"
            onClick={onPreviousPage}
          >
            <FiChevronLeft size={14} />
          </button>
          <span className="min-w-10 text-center font-mono">
            {pageIndex + 1} / {pageCount}
          </span>
          <button
            aria-label="Next bookmark page"
            className="btn btn-ghost btn-xs btn-square"
            disabled={pageIndex >= pageCount - 1}
            type="button"
            onClick={onNextPage}
          >
            <FiChevronRight size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export { RecordingBookmarksPanel };
