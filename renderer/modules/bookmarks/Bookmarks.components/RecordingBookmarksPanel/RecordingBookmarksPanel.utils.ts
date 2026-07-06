import type {
  BookmarkCategory,
  RecordingBookmark,
} from "~/main/modules/bookmarks";
import {
  allBookmarkCategoriesValue,
  type BookmarkCategoryFilterValue,
  type BookmarkCategoryToggleState,
  resolveBookmarkCategoryToggle,
} from "~/renderer/modules/bookmarks/Bookmarks.utils";

const allRecordingBookmarkCategoriesValue = allBookmarkCategoriesValue;
const recordingBookmarksPanelPageSize = 5;

type RecordingBookmarkCategoryFilter = BookmarkCategoryFilterValue;

type RecordingBookmarkCategoryToggleState = BookmarkCategoryToggleState;

function resolveRecordingBookmarkCategories(
  bookmarks: RecordingBookmark[],
): BookmarkCategory[] {
  return Array.from(new Set(bookmarks.map((bookmark) => bookmark.category)));
}

function resolveRecordingBookmarkCategoryToggle(
  current: RecordingBookmarkCategoryToggleState,
  category: RecordingBookmarkCategoryFilter,
): RecordingBookmarkCategoryToggleState {
  return resolveBookmarkCategoryToggle(current, category);
}

export {
  allRecordingBookmarkCategoriesValue,
  type RecordingBookmarkCategoryFilter,
  type RecordingBookmarkCategoryToggleState,
  recordingBookmarksPanelPageSize,
  resolveRecordingBookmarkCategories,
  resolveRecordingBookmarkCategoryToggle,
};
