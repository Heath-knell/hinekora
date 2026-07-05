import { describe, expect, it } from "vitest";

import {
  allBookmarkCategoriesValue,
  defaultRewindTimelineMarkerFilterValue,
} from "~/renderer/modules/bookmarks/Bookmarks.utils";
import type { BoundStore } from "~/renderer/store/store.types";
import { createBoundStoreForTests } from "~/renderer/test/createBoundStoreForTests";

import { createRewindsSlice } from "./Rewinds.slice";

function createTestStore() {
  return createBoundStoreForTests((set, get, api) => {
    const rewindsSlice = createRewindsSlice(set, get, api);

    return rewindsSlice as unknown as BoundStore;
  });
}

describe("Rewinds slice", () => {
  it("tracks rewind detail filters and hover state", () => {
    const store = createTestStore();

    expect(store.getState().rewinds.detail).toEqual({
      bookmarkCategoryFilter: allBookmarkCategoriesValue,
      bookmarkPageIndex: 0,
      hoveredBookmarkId: null,
      timelineMarkerCategoryFilter: defaultRewindTimelineMarkerFilterValue,
    });

    store.getState().rewinds.setDetailBookmarkPageIndex(4);
    store.getState().rewinds.setDetailHoveredBookmarkId("bookmark-2");
    store.getState().rewinds.selectDetailBookmarkCategory("map");

    expect(store.getState().rewinds.detail).toEqual({
      bookmarkCategoryFilter: "map",
      bookmarkPageIndex: 0,
      hoveredBookmarkId: "bookmark-2",
      timelineMarkerCategoryFilter: "map",
    });

    store.getState().rewinds.setDetailTimelineMarkerCategory("death");
    expect(store.getState().rewinds.detail.timelineMarkerCategoryFilter).toBe(
      "death",
    );

    store.getState().rewinds.setDetailBookmarkPageIndex(-3);
    expect(store.getState().rewinds.detail.bookmarkPageIndex).toBe(0);

    store.getState().rewinds.resetDetail();
    expect(store.getState().rewinds.detail).toEqual({
      bookmarkCategoryFilter: allBookmarkCategoriesValue,
      bookmarkPageIndex: 0,
      hoveredBookmarkId: null,
      timelineMarkerCategoryFilter: defaultRewindTimelineMarkerFilterValue,
    });
  });
});
