import { describe, expect, it } from "vitest";

import type { BoundStore } from "~/renderer/store/store.types";
import { createBoundStoreForTests } from "~/renderer/test/createBoundStoreForTests";

import { allBookmarkCategoriesValue } from "../Bookmarks.utils";
import { createBookmarksSlice } from "./Bookmarks.slice";

function createTestStore() {
  return createBoundStoreForTests((set, get, api) => {
    const bookmarksSlice = createBookmarksSlice(set, get, api);

    return bookmarksSlice as unknown as BoundStore;
  });
}

describe("Bookmarks slice", () => {
  it("tracks recording detail filters and hover state", () => {
    const store = createTestStore();

    expect(store.getState().bookmarks.recordingDetail).toEqual({
      categoryFilter: allBookmarkCategoriesValue,
      hasInteracted: false,
      hoveredBookmarkId: null,
      pageIndex: 0,
    });

    store.getState().bookmarks.setRecordingDetailPageIndex(3);
    store
      .getState()
      .bookmarks.setRecordingDetailHoveredBookmarkId("bookmark-1");
    store.getState().bookmarks.selectRecordingDetailCategory("death");

    expect(store.getState().bookmarks.recordingDetail).toEqual({
      categoryFilter: "death",
      hasInteracted: true,
      hoveredBookmarkId: "bookmark-1",
      pageIndex: 0,
    });

    store.getState().bookmarks.setRecordingDetailPageIndex(-2);
    expect(store.getState().bookmarks.recordingDetail.pageIndex).toBe(0);

    store.getState().bookmarks.resetRecordingDetail();
    expect(store.getState().bookmarks.recordingDetail).toEqual({
      categoryFilter: allBookmarkCategoriesValue,
      hasInteracted: false,
      hoveredBookmarkId: null,
      pageIndex: 0,
    });
  });
});
