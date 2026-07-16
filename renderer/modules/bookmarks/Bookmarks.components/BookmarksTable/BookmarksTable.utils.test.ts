import { describe, expect, it } from "vitest";

import type { BookmarkLibraryItem } from "~/main/modules/bookmarks";

import {
  getCellClassName,
  resolveBookmarkLibraryTarget,
  resolveBookmarkTableSeparator,
  resolveSortBy,
} from "./BookmarksTable.utils";

function createBookmarkLibraryItem(
  input: Partial<BookmarkLibraryItem>,
): BookmarkLibraryItem {
  return {
    activeActivitySessionBookmarkDurationSeconds: null,
    activeActivitySessionId: null,
    activeActivitySessionDurationSeconds: null,
    activeActivitySessionOffsetSeconds: null,
    activeRecordingBookmarkDurationSeconds: null,
    activeRecordingDurationSeconds: null,
    activeRecordingId: null,
    activeRecordingOffsetSeconds: null,
    archivedRecordingBookmarkDurationSeconds: null,
    archivedRecordingDurationSeconds: null,
    archivedRecordingId: null,
    archivedRecordingTitle: null,
    category: "map",
    createdAt: "2026-07-04T00:00:00.000Z",
    id: "bookmark",
    label: "Location",
    note: null,
    occurredAt: "2026-07-04T00:00:00.000Z",
    sceneName: "Location",
    source: "client-log",
    sourceGame: "poe2",
    sourceLeague: "Standard",
    subcategory: null,
    updatedAt: "2026-07-04T00:00:00.000Z",
    ...input,
  };
}

describe("BookmarksTable utils", () => {
  it("supports the league table column classes and sorting", () => {
    expect(getCellClassName("sourceLeague")).toContain("whitespace-nowrap");
    expect(resolveSortBy("sourceLeague")).toBe("sourceLeague");
  });

  it("resolves active recording targets before rewind and archived recording targets", () => {
    expect(
      resolveBookmarkLibraryTarget(
        createBookmarkLibraryItem({
          activeActivitySessionId: "rewind-1",
          activeActivitySessionOffsetSeconds: 4,
          activeRecordingId: "recording-1",
          activeRecordingOffsetSeconds: 2,
          archivedRecordingId: "archived-recording-1",
        }),
      ),
    ).toEqual({
      bookmarkDurationSeconds: null,
      durationSeconds: null,
      id: "recording-1",
      kind: "recording",
      offsetSeconds: 2,
    });
  });

  it("resolves rewind targets before archived recording targets", () => {
    expect(
      resolveBookmarkLibraryTarget(
        createBookmarkLibraryItem({
          activeActivitySessionId: "rewind-1",
          activeActivitySessionOffsetSeconds: 4,
          archivedRecordingId: "archived-recording-1",
        }),
      ),
    ).toEqual({
      bookmarkDurationSeconds: null,
      durationSeconds: null,
      id: "rewind-1",
      kind: "rewind",
      offsetSeconds: 4,
    });
  });

  it("resolves archived recording targets last", () => {
    expect(
      resolveBookmarkLibraryTarget(
        createBookmarkLibraryItem({
          archivedRecordingDurationSeconds: 120,
          archivedRecordingId: "archived-recording-1",
          archivedRecordingTitle: "Recording",
        }),
      ),
    ).toEqual({
      bookmarkDurationSeconds: null,
      durationSeconds: 120,
      id: "archived-recording-1",
      kind: "archived-recording",
      title: "Recording",
    });
  });

  it("does not separate rows from the same recording", () => {
    expect(
      resolveBookmarkTableSeparator({
        previousBookmark: createBookmarkLibraryItem({
          activeRecordingId: "recording-1",
          id: "bookmark-1",
        }),
        bookmark: createBookmarkLibraryItem({
          activeRecordingId: "recording-1",
          id: "bookmark-2",
        }),
        sortDirection: "desc",
      }),
    ).toBeNull();
  });

  it("separates newest-first rows without switching the labels", () => {
    expect(
      resolveBookmarkTableSeparator({
        previousBookmark: createBookmarkLibraryItem({
          activeRecordingId: "recording-1",
          id: "bookmark-1",
        }),
        bookmark: createBookmarkLibraryItem({
          activeActivitySessionId: "rewind-1",
          id: "bookmark-2",
        }),
        sortDirection: "desc",
      }),
    ).toEqual({
      nextLabel: "Recording",
      previousLabel: "Rewind",
    });
  });

  it("separates oldest-first rows without switching the labels", () => {
    expect(
      resolveBookmarkTableSeparator({
        previousBookmark: createBookmarkLibraryItem({
          activeRecordingId: "recording-1",
          id: "bookmark-1",
        }),
        bookmark: createBookmarkLibraryItem({
          activeActivitySessionId: "rewind-1",
          id: "bookmark-2",
        }),
        sortDirection: "asc",
      }),
    ).toEqual({
      nextLabel: "Rewind",
      previousLabel: "Recording",
    });
  });

  it("does not separate standalone bookmark rows", () => {
    expect(
      resolveBookmarkTableSeparator({
        previousBookmark: createBookmarkLibraryItem({ id: "bookmark-1" }),
        bookmark: createBookmarkLibraryItem({
          activeRecordingId: "recording-1",
          id: "bookmark-2",
        }),
        sortDirection: "desc",
      }),
    ).toBeNull();
  });
});
