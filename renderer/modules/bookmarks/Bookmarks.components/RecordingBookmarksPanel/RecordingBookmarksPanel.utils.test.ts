import { describe, expect, it } from "vitest";

import { allBookmarkCategoriesValue } from "../../Bookmarks.utils";
import { resolveRecordingBookmarkCategoryToggle } from "./RecordingBookmarksPanel.utils";

describe("RecordingBookmarksPanel utils", () => {
  it("toggles a repeated category chip off", () => {
    expect(
      resolveRecordingBookmarkCategoryToggle(
        {
          categoryFilter: "map",
          hasInteracted: true,
        },
        "map",
      ),
    ).toEqual({
      categoryFilter: allBookmarkCategoriesValue,
      hasInteracted: false,
    });
  });

  it("toggles the all chip on and off", () => {
    expect(
      resolveRecordingBookmarkCategoryToggle(
        {
          categoryFilter: allBookmarkCategoriesValue,
          hasInteracted: false,
        },
        allBookmarkCategoriesValue,
      ),
    ).toEqual({
      categoryFilter: allBookmarkCategoriesValue,
      hasInteracted: true,
    });

    expect(
      resolveRecordingBookmarkCategoryToggle(
        {
          categoryFilter: allBookmarkCategoriesValue,
          hasInteracted: true,
        },
        allBookmarkCategoriesValue,
      ),
    ).toEqual({
      categoryFilter: allBookmarkCategoriesValue,
      hasInteracted: false,
    });
  });
});
