import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RecordingBookmark } from "~/main/modules/bookmarks";

import { RecordingBookmarksPanel } from "./RecordingBookmarksPanel";
import { allRecordingBookmarkCategoriesValue } from "./RecordingBookmarksPanel.utils";

function createBookmark(
  overrides: Partial<RecordingBookmark> = {},
): RecordingBookmark {
  return {
    category: "map",
    createdAt: "2026-07-03T10:00:00.000Z",
    durationSeconds: 30,
    id: "bookmark-1",
    label: "Qimah Reservoir",
    note: null,
    occurredAt: "2026-07-03T10:00:05.000Z",
    offsetSeconds: 5,
    sceneName: "Qimah Reservoir",
    source: "client-log",
    sourceGame: "poe2",
    sourceLeague: "Standard",
    subcategory: null,
    updatedAt: "2026-07-03T10:00:00.000Z",
    ...overrides,
  };
}

describe("RecordingBookmarksPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders custom empty copy for the owning detail page", () => {
    act(() => {
      root.render(
        <RecordingBookmarksPanel
          bookmarks={[]}
          categories={[]}
          categoryFilter={allRecordingBookmarkCategoriesValue}
          emptyMessage="No bookmarks are attached to this rewind yet."
          heightPixels={null}
          pageCount={1}
          pageIndex={0}
          totalCount={0}
          onCategoryChange={vi.fn()}
          onNextPage={vi.fn()}
          onPreviousPage={vi.fn()}
          onSelectBookmark={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain(
      "No bookmarks are attached to this rewind yet.",
    );
  });

  it("fires category, pagination, selection, and hover interactions", () => {
    const bookmark = createBookmark();
    const onCategoryChange = vi.fn();
    const onHoverBookmark = vi.fn();
    const onNextPage = vi.fn();
    const onPreviousPage = vi.fn();
    const onSelectBookmark = vi.fn();

    act(() => {
      root.render(
        <RecordingBookmarksPanel
          bookmarks={[bookmark]}
          categories={["map", "death"]}
          categoryFilter={allRecordingBookmarkCategoriesValue}
          heightPixels={null}
          pageCount={2}
          pageIndex={0}
          totalCount={6}
          onCategoryChange={onCategoryChange}
          onHoverBookmark={onHoverBookmark}
          onNextPage={onNextPage}
          onPreviousPage={onPreviousPage}
          onSelectBookmark={onSelectBookmark}
        />,
      );
    });

    const mapCategoryButton = Array.from(
      container.querySelectorAll("button"),
    ).find((button) => button.textContent === "Map");

    act(() => {
      mapCategoryButton?.click();
    });
    expect(onCategoryChange).toHaveBeenCalledWith("map");

    const bookmarkButton = Array.from(
      container.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Qimah Reservoir"));
    expect(bookmarkButton).toBeDefined();

    act(() => {
      bookmarkButton?.dispatchEvent(
        new MouseEvent("pointerover", { bubbles: true }),
      );
      bookmarkButton?.click();
      bookmarkButton?.dispatchEvent(
        new MouseEvent("pointerout", { bubbles: true }),
      );
    });
    expect(onHoverBookmark).toHaveBeenCalledWith(bookmark);
    expect(onSelectBookmark).toHaveBeenCalledWith(bookmark);
    expect(onHoverBookmark).toHaveBeenCalledWith(null);

    act(() => {
      container
        .querySelector<HTMLButtonElement>(
          "button[aria-label='Next bookmark page']",
        )
        ?.click();
      container
        .querySelector<HTMLButtonElement>(
          "button[aria-label='Previous bookmark page']",
        )
        ?.click();
    });

    expect(onNextPage).toHaveBeenCalledTimes(1);
    expect(onPreviousPage).not.toHaveBeenCalled();
  });
});
