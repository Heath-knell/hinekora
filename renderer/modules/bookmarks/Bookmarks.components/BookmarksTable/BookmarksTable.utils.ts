import clsx from "clsx";

import type {
  BookmarkLibraryItem,
  BookmarkLibrarySortDirection,
  BookmarkLibrarySortKey,
} from "~/main/modules/bookmarks/Bookmarks.dto";
import { bookmarkCategoryRowClassNames } from "~/renderer/modules/bookmarks/Bookmarks.utils";

interface BookmarkTableContext {
  key: string;
  label: "Recording" | "Rewind";
}

interface BookmarkTableSeparator {
  nextLabel: BookmarkTableContext["label"];
  previousLabel: BookmarkTableContext["label"];
}

type BookmarkLibraryTarget =
  | {
      bookmarkDurationSeconds: number | null;
      durationSeconds: number | null;
      id: string;
      kind: "recording";
      offsetSeconds: number | null;
    }
  | {
      bookmarkDurationSeconds: number | null;
      durationSeconds: number | null;
      id: string;
      kind: "rewind";
      offsetSeconds: number | null;
    }
  | {
      bookmarkDurationSeconds: number | null;
      durationSeconds: number | null;
      id: string;
      kind: "archived-recording";
      title: string | null;
    };

function getHeaderClassName(columnId: string): string {
  return clsx(
    "sticky top-0 z-10 bg-base-200 text-base-content/55",
    columnId === "categoryIcon" && "w-10",
    columnId === "label" && "w-full",
    ["actions", "duration", "recordingTime"].includes(columnId) && "text-right",
  );
}

function getCellClassName(columnId: string): string {
  return clsx(
    columnId === "categoryIcon" && "w-10 text-center",
    columnId === "occurredAt" && "whitespace-nowrap",
    columnId === "label" && "w-full",
    columnId === "sourceLeague" && "whitespace-nowrap",
    columnId === "duration" && "w-28 whitespace-nowrap text-right tabular-nums",
    columnId === "recordingTime" &&
      "w-36 whitespace-nowrap text-right tabular-nums",
    columnId === "actions" && "w-24 whitespace-nowrap text-right",
  );
}

function getRowClassName(bookmark: BookmarkLibraryItem): string {
  return bookmarkCategoryRowClassNames[bookmark.category];
}

function resolveSortBy(columnId: string | undefined): BookmarkLibrarySortKey {
  switch (columnId) {
    case "category":
    case "label":
    case "occurredAt":
    case "sourceLeague":
      return columnId;
    default:
      return "occurredAt";
  }
}

function resolveBookmarkLibraryTarget(
  bookmark: BookmarkLibraryItem,
): BookmarkLibraryTarget | null {
  if (bookmark.activeRecordingId) {
    return {
      bookmarkDurationSeconds: bookmark.activeRecordingBookmarkDurationSeconds,
      durationSeconds: bookmark.activeRecordingDurationSeconds,
      id: bookmark.activeRecordingId,
      kind: "recording",
      offsetSeconds: bookmark.activeRecordingOffsetSeconds,
    };
  }

  if (bookmark.activeActivitySessionId) {
    return {
      bookmarkDurationSeconds:
        bookmark.activeActivitySessionBookmarkDurationSeconds,
      durationSeconds: bookmark.activeActivitySessionDurationSeconds,
      id: bookmark.activeActivitySessionId,
      kind: "rewind",
      offsetSeconds: bookmark.activeActivitySessionOffsetSeconds,
    };
  }

  if (bookmark.archivedRecordingId) {
    return {
      bookmarkDurationSeconds:
        bookmark.archivedRecordingBookmarkDurationSeconds,
      durationSeconds: bookmark.archivedRecordingDurationSeconds,
      id: bookmark.archivedRecordingId,
      kind: "archived-recording",
      title: bookmark.archivedRecordingTitle,
    };
  }

  return null;
}

function resolveBookmarkTableContext(
  bookmark: BookmarkLibraryItem,
): BookmarkTableContext | null {
  const target = resolveBookmarkLibraryTarget(bookmark);
  if (!target) {
    return null;
  }

  if (target.kind === "rewind") {
    return { key: `rewind:${target.id}`, label: "Rewind" };
  }

  return { key: `recording:${target.id}`, label: "Recording" };
}

function resolveBookmarkTableSeparator(input: {
  previousBookmark: BookmarkLibraryItem;
  bookmark: BookmarkLibraryItem;
  sortDirection: BookmarkLibrarySortDirection;
}): BookmarkTableSeparator | null {
  const previousContext = resolveBookmarkTableContext(input.previousBookmark);
  const nextContext = resolveBookmarkTableContext(input.bookmark);

  if (
    !previousContext ||
    !nextContext ||
    previousContext.key === nextContext.key
  ) {
    return null;
  }

  if (input.sortDirection === "desc") {
    return {
      nextLabel: previousContext.label,
      previousLabel: nextContext.label,
    };
  }

  return {
    nextLabel: nextContext.label,
    previousLabel: previousContext.label,
  };
}

export type { BookmarkLibraryTarget, BookmarkTableSeparator };
export {
  getCellClassName,
  getHeaderClassName,
  getRowClassName,
  resolveBookmarkLibraryTarget,
  resolveBookmarkTableSeparator,
  resolveSortBy,
};
